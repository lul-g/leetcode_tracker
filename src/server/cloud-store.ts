import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canonical } from "@/lib/cloud/canonical";
import { normalizeKey } from "@/lib/cloud/key";
import { TABLES, decide, type Row, type Table } from "@/lib/cloud/merge";

/**
 * Your data in Supabase, as five real tables (see supabase/schema.sql). Reached only from this
 * server, with the project's secret key; the browser never sees that key or talks to Supabase.
 * The three environment variables (set in Vercel, or .env.local) are read here only.
 */

// Vercel rejects request bodies over 4.5 MB, so stay safely under it.
export const MAX_BYTES = 4_000_000;

// Trimmed and unquoted, because a stray space, newline or pair of quotes pasted into a settings
// page is easy to miss (Vercel keeps quotes as part of the value).
const clean = (v: string | undefined) => (v ? normalizeKey(v) : "") || undefined;
const env = () => ({
  url: clean(process.env.SUPABASE_URL),
  key: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  syncKey: clean(process.env.PACER_SYNC_KEY),
});

/** Names (never values) of the settings this server is missing. */
export function missingConfig(): string[] {
  const e = env();
  const missing: string[] = [];
  if (!e.url) missing.push("SUPABASE_URL");
  if (!e.key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!e.syncKey) missing.push("PACER_SYNC_KEY");
  return missing;
}

export const cloudConfigured = () => missingConfig().length === 0;

const sha = (s: string) => createHash("sha256").update(s, "utf8");

/**
 * Does what the browser sent match PACER_SYNC_KEY? The browser sends a SHA-256 fingerprint of the
 * normalised key (or the normalised key itself on pages that can't hash); both are accepted.
 * Compared in constant time.
 */
export function syncKeyMatches(sent: string | null): boolean {
  const configured = env().syncKey;
  if (!configured || !sent) return false;
  const expected = normalizeKey(configured);
  const got = sha(sent.trim()).digest();
  const asToken = sha(sha(expected).digest("hex")).digest();
  const asPlain = sha(expected).digest();
  // evaluate both so timing doesn't reveal which form was sent
  const a = timingSafeEqual(got, asToken);
  const b = timingSafeEqual(got, asPlain);
  return a || b;
}

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (client) return client;
  const { url, key } = env();
  client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// ------------------------------------------------------------------------------- the tables

const DEF: Record<Table, { name: string; pk: string }> = {
  problems: { name: "pacer_problems", pk: "slug" },
  manual: { name: "pacer_manual_solves", pk: "slug" },
  notes: { name: "pacer_notes", pk: "slug" },
  settings: { name: "pacer_settings", pk: "key" },
  secrets: { name: "pacer_secrets", pk: "name" },
};

// ------------------------------------------------------------------------ database health

/** How the database check went, in plain categories (never raw errors, which could name your project). */
export type DbHealth =
  | "ok"
  | "missing_table"
  | "wrong_role" // the key is the publishable/anon one: it may not touch these tables
  | "no_grants" // the key is the secret one, but the tables never granted it access
  | "bad_secret" // Supabase does not recognise the key at all
  | "unreachable"
  | "error";

/** What kind of Supabase key is configured, judged from its own shape (nothing is revealed). */
function keyKind(key: string | undefined): "publishable" | "secret" | "unknown" {
  if (!key) return "unknown";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const role = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role;
      if (role === "anon") return "publishable";
      if (role === "service_role") return "secret";
    } catch {}
  }
  return "unknown";
}

function classify(error: { code?: string; message?: string } | null): DbHealth {
  if (!error) return "ok";
  const msg = error.message ?? "";
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(msg))
    return "missing_table";
  if (error.code === "42501" || /permission denied|row-level security|not allowed/i.test(msg))
    // a publishable key is simply the wrong key; anything else was refused for lack of a grant
    return keyKind(env().key) === "publishable" ? "wrong_role" : "no_grants";
  if (/invalid api key|jwt|apikey|unauthori[sz]ed|no api key/i.test(msg)) return "bad_secret";
  if (/fetch failed|enotfound|econnrefused|network|timed? ?out|getaddrinfo|invalid url/i.test(msg))
    return "unreachable";
  return "error";
}

let healthCache: { at: number; v: DbHealth } | null = null;

/** One cheap query per table to see whether Pacer can really reach them. Cached for 30 seconds. */
export async function dbHealth(): Promise<DbHealth> {
  if (healthCache && Date.now() - healthCache.at < 30_000) return healthCache.v;
  let v: DbHealth = "ok";
  try {
    const results = await Promise.all(
      TABLES.map(async (t) => {
        const { error } = await db().from(DEF[t].name).select(DEF[t].pk).limit(1);
        return classify(error);
      }),
    );
    v = results.find((r) => r !== "ok") ?? "ok";
  } catch {
    v = "unreachable";
  }
  healthCache = { at: Date.now(), v };
  return v;
}

// -------------------------------------------------------------------------- reading/writing

type DbRow = Record<string, unknown>;

export type RemoteRow = { table: Table; key: string; value: string | null };

export type InChange = {
  table: Table;
  key: string;
  value: string | null;
  editedAt: number;
};

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A stored row as the text this app uses (canonical JSON, null = deleted). */
function toRow(table: Table, r: DbRow): Row {
  const editedAt = Number(r.edited_at ?? 0);
  if (table === "problems") return { value: canonical(r.submissions ?? []), editedAt };
  if (r.deleted) return { value: null, editedAt };
  switch (table) {
    case "manual":
      return {
        value: canonical({
          slug: r.slug,
          title: r.title,
          number: r.number,
          difficulty: r.difficulty,
          solvedAt: r.solved_on,
        }),
        editedAt,
      };
    case "notes":
      return { value: canonical({ note: r.note, review: r.needs_review }), editedAt };
    default:
      return { value: canonical(r.value ?? null), editedAt };
  }
}

/** Is this change one we're willing to store? Checked before anything is written. */
export function validChange(c: InChange): boolean {
  if (!c || typeof c !== "object") return false;
  if (!(TABLES as readonly string[]).includes(c.table)) return false;
  if (typeof c.key !== "string" || !c.key || c.key.length > 300) return false;
  if (typeof c.editedAt !== "number" || !Number.isFinite(c.editedAt)) return false;
  if (c.value === null) return true;
  if (typeof c.value !== "string") return false;
  let v: unknown;
  try {
    v = JSON.parse(c.value);
  } catch {
    return false;
  }
  if (c.table === "problems") return Array.isArray(v);
  if (c.table === "manual") {
    const m = v as { title?: unknown; difficulty?: unknown; solvedAt?: unknown; number?: unknown } | null;
    return (
      !!m &&
      typeof m.title === "string" &&
      DIFFICULTIES.has(String(m.difficulty)) &&
      typeof m.solvedAt === "string" &&
      DATE.test(m.solvedAt) &&
      (m.number === undefined || typeof m.number === "number")
    );
  }
  if (c.table === "notes") {
    const n = v as { note?: unknown; review?: unknown } | null;
    return !!n && typeof n.note === "string" && typeof n.review === "boolean";
  }
  return true;
}

/** The database row to store for a decision (null when there's nothing to store). */
function toDb(
  table: Table,
  key: string,
  result: Row,
  existing: DbRow | undefined,
  nowIso: string,
): DbRow | null {
  const pk = DEF[table].pk;
  const base = { [pk]: key, edited_at: result.editedAt, updated_at: nowIso };

  if (table === "problems") {
    const subs = (JSON.parse(result.value ?? "[]") as { t: number; ok: boolean }[]) ?? [];
    const accepted = subs.filter((s) => s.ok);
    const first = accepted.length ? Math.min(...accepted.map((s) => s.t)) : null;
    return {
      ...base,
      number: existing?.number ?? null,
      title: existing?.title ?? null,
      difficulty: existing?.difficulty ?? null,
      first_accepted_at: first === null ? null : new Date(first * 1000).toISOString(),
      accepted_count: accepted.length,
      attempt_count: subs.length,
      submissions: subs,
    };
  }

  // a delete: mark the row, keep the rest (nothing to mark if it never existed)
  if (result.value === null) {
    return existing ? { ...existing, deleted: true, edited_at: result.editedAt, updated_at: nowIso } : null;
  }
  const v = JSON.parse(result.value);
  switch (table) {
    case "manual":
      return {
        ...base,
        title: v.title,
        number: v.number ?? 0,
        difficulty: v.difficulty,
        solved_on: v.solvedAt,
        deleted: false,
      };
    case "notes":
      return { ...base, note: v.note, needs_review: v.review, deleted: false };
    default:
      return { ...base, value: v, deleted: false };
  }
}

const CHUNK = 100;

async function fetchExisting(table: Table, keys: string[]): Promise<Map<string, DbRow>> {
  const { name, pk } = DEF[table];
  const found = new Map<string, DbRow>();
  for (let i = 0; i < keys.length; i += CHUNK) {
    const { data, error } = await db().from(name).select("*").in(pk, keys.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const r of data ?? []) found.set(String(r[pk]), r);
  }
  return found;
}

/**
 * Apply rows a computer sent, one rule per table (see decide). Returns the final state of every row
 * it was asked about, so the computer can adopt whatever the cloud decided.
 */
export async function applyChanges(changes: InChange[], first: boolean): Promise<RemoteRow[]> {
  const nowIso = new Date().toISOString();
  const out: RemoteRow[] = [];

  for (const table of TABLES) {
    const mine = changes.filter((c) => c.table === table);
    if (!mine.length) continue;
    const { name, pk } = DEF[table];
    const existing = await fetchExisting(table, mine.map((c) => c.key));
    const writes: DbRow[] = [];

    for (const c of mine) {
      const ex = existing.get(c.key);
      const d = decide(
        table,
        ex ? toRow(table, ex) : undefined,
        { value: c.value, editedAt: Math.min(c.editedAt, Date.now() + 60_000) },
        first,
      );
      if (d.write) {
        const row = toDb(table, c.key, d.result, ex, nowIso);
        if (row) writes.push(row);
      }
      out.push({ table, key: c.key, value: d.result.value });
    }
    for (let i = 0; i < writes.length; i += 200) {
      const { error } = await db().from(name).upsert(writes.slice(i, i + 200), { onConflict: pk });
      if (error) throw new Error(error.message);
    }
  }
  return out;
}

const PAGE = 1000;
/** Re-read this much before the newest row we've seen, in case a slower instance stamped a row late. */
const OVERLAP_MS = 5000;

/** Every row changed at or after `cursor` (all rows when null), plus the new cursor. */
export async function readSince(
  cursor: string | null,
): Promise<{ rows: RemoteRow[]; cursor: string | null }> {
  const rows: RemoteRow[] = [];
  let newest = 0;

  for (const table of TABLES) {
    const { name, pk } = DEF[table];
    for (let from = 0; ; from += PAGE) {
      let q = db()
        .from(name)
        .select("*")
        .order("updated_at", { ascending: true })
        .order(pk, { ascending: true })
        .range(from, from + PAGE - 1);
      if (cursor) q = q.gte("updated_at", cursor);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        rows.push({ table, key: String(r[pk]), value: toRow(table, r).value });
        newest = Math.max(newest, new Date(String(r.updated_at)).getTime());
      }
      if ((data?.length ?? 0) < PAGE) break;
    }
  }
  // never null once a sync has happened, so a computer can tell "met the cloud" from "never synced"
  const next = newest ? new Date(newest - OVERLAP_MS).toISOString() : (cursor ?? new Date(0).toISOString());
  return { rows, cursor: next };
}

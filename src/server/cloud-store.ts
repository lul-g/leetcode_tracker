import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SECTION_IDS, type Remote } from "@/lib/cloud/engine";
import { normalizeKey } from "@/lib/cloud/key";

/**
 * The cloud copy of your data: one row in Supabase, reached only from this server with the
 * project's secret (service-role) key. The browser never sees that key or talks to Supabase.
 * The three environment variables (set in Vercel, or .env.local) are read here only.
 */
const TABLE = "pacer_data";
const ROW_ID = "me";
/** Vercel rejects request bodies over 4.5 MB, so stay safely under it. */
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

/** Are all three settings present on the server? */
export function cloudConfigured(): boolean {
  return missingConfig().length === 0;
}

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

/** Accept only the shape we write ourselves, so a stolen key can't plant arbitrary data. */
export function parseSections(input: unknown): Remote | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Remote = {};
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!(SECTION_IDS as string[]).includes(id)) return null;
    const sec = raw as { v?: unknown; at?: unknown };
    if (!sec || typeof sec !== "object") return null;
    if (!(sec.v === null || typeof sec.v === "string")) return null;
    if (typeof sec.at !== "number" || !Number.isFinite(sec.at)) return null;
    out[id as keyof Remote] = { v: sec.v as string | null, at: sec.at };
  }
  return out;
}

/** How the database check went, in plain categories (never raw errors, which could name your project). */
export type DbHealth =
  | "ok"
  | "missing_table"
  | "wrong_role" // the key is the publishable/anon one: it may not touch this table
  | "no_grants" // the key is the secret one, but the table never granted it access
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

let healthCache: { at: number; v: DbHealth } | null = null;

/** One cheap query to see whether Pacer can really reach its table. Cached for 30 seconds. */
export async function dbHealth(): Promise<DbHealth> {
  if (healthCache && Date.now() - healthCache.at < 30_000) return healthCache.v;
  let v: DbHealth;
  try {
    const { error } = await db().from(TABLE).select("id").limit(1);
    const msg = error?.message ?? "";
    if (!error) v = "ok";
    else if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(msg))
      v = "missing_table";
    else if (error.code === "42501" || /permission denied|row-level security|not allowed/i.test(msg))
      // a publishable key is simply the wrong key; anything else was refused for lack of a grant
      v = keyKind(env().key) === "publishable" ? "wrong_role" : "no_grants";
    else if (/invalid api key|jwt|apikey|unauthori[sz]ed|no api key/i.test(msg)) v = "bad_secret";
    else if (/fetch failed|enotfound|econnrefused|network|timed? ?out|getaddrinfo|invalid url/i.test(msg))
      v = "unreachable";
    else v = "error";
  } catch {
    v = "unreachable";
  }
  healthCache = { at: Date.now(), v };
  return v;
}

export async function loadRow(): Promise<{ data: Remote; version: string | null }> {
  const { data, error } = await db()
    .from(TABLE)
    .select("data, updated_at")
    .eq("id", ROW_ID);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { data: (row?.data ?? {}) as Remote, version: row?.updated_at ?? null };
}

export type SaveOutcome =
  | { ok: true; version: string }
  | { ok: false; conflict: true }
  | { ok: false; conflict?: false; error: string };

/** Write only if nobody else has since `version` (null = the row doesn't exist yet). */
export async function saveRow(data: Remote, version: string | null): Promise<SaveOutcome> {
  const now = new Date().toISOString();
  if (version === null) {
    const { data: rows, error } = await db()
      .from(TABLE)
      .insert({ id: ROW_ID, data, updated_at: now })
      .select("updated_at");
    // 23505: another computer created the row first
    if (error) {
      return error.code === "23505"
        ? { ok: false, conflict: true }
        : { ok: false, error: error.message };
    }
    return { ok: true, version: rows![0].updated_at };
  }
  const { data: rows, error } = await db()
    .from(TABLE)
    .update({ data, updated_at: now })
    .eq("id", ROW_ID)
    .eq("updated_at", version)
    .select("updated_at");
  if (error) return { ok: false, error: error.message };
  // nothing matched: another computer wrote since this one read
  if (!rows || rows.length === 0) return { ok: false, conflict: true };
  return { ok: true, version: rows[0].updated_at };
}

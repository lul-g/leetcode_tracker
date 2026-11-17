import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SECTION_IDS, type Remote } from "@/lib/cloud/engine";

/**
 * The cloud copy of your data: one row in Supabase, reached only from this server with the
 * project's secret (service-role) key. The browser never sees that key or talks to Supabase.
 * The three environment variables (set in Vercel, or .env.local) are read here only.
 */
const TABLE = "pacer_data";
const ROW_ID = "me";
/** Vercel rejects request bodies over 4.5 MB, so stay safely under it. */
export const MAX_BYTES = 4_000_000;

const env = () => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  syncKey: process.env.PACER_SYNC_KEY,
});

/** Are all three settings present on the server? */
export function cloudConfigured(): boolean {
  const e = env();
  return Boolean(e.url && e.key && e.syncKey);
}

/** Does the key the browser sent match PACER_SYNC_KEY? Compared in constant time. */
export function syncKeyMatches(sent: string | null): boolean {
  const expected = env().syncKey;
  if (!expected || !sent) return false;
  const a = createHash("sha256").update(sent).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
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

import type { Remote } from "./engine";
import { keyToken } from "./key";
import {
  BadKeyError,
  NotConfiguredError,
  type CloudBackend,
  type SaveResult,
} from "./types";

/** Is cloud sync set up on the server, and if not, which settings are missing (names only)? Needs no key. */
export type DbHealth =
  | "ok"
  | "missing_table"
  | "wrong_role"
  | "no_grants"
  | "bad_secret"
  | "unreachable"
  | "error";

export async function fetchStatus(): Promise<{
  configured: boolean;
  missing: string[];
  db: DbHealth | null;
}> {
  try {
    const res = await fetch("/api/cloud?status", { cache: "no-store" });
    const json = (await res.json()) as {
      configured?: boolean;
      missing?: string[];
      db?: DbHealth;
    };
    return { configured: !!json.configured, missing: json.missing ?? [], db: json.db ?? null };
  } catch {
    return { configured: false, missing: [], db: null };
  }
}

/**
 * Talks to this app's own /api/cloud, sending the sync key with every request. The server holds
 * the database credentials; this browser only ever has the sync key.
 */
export function createHttpBackend(): CloudBackend {
  const headers = async (key: string) => ({
    "content-type": "application/json",
    "x-sync-key": await keyToken(key),
  });

  async function call(init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetch("/api/cloud", { cache: "no-store", ...init });
    } catch {
      throw new Error("Could not reach the server. Check your connection.");
    }
    if (res.status === 503) throw new NotConfiguredError();
    if (res.status === 401) throw new BadKeyError();
    return res;
  }

  return {
    async load(key) {
      const res = await call({ headers: await headers(key) });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; data: Remote; version: string | null }
        | { ok: false; error: string }
        | null;
      if (!json || !json.ok) throw new Error(json && !json.ok ? json.error : "Bad reply.");
      return { data: json.data ?? {}, version: json.version };
    },

    async save(key, data, version): Promise<SaveResult> {
      const res = await call({
        method: "PUT",
        headers: await headers(key),
        body: JSON.stringify({ data, version }),
      });
      if (res.status === 409) return { ok: false, conflict: true };
      const json = (await res.json().catch(() => null)) as
        | { ok: true; version: string }
        | { ok: false; error: string }
        | null;
      if (json && json.ok) return { ok: true, version: json.version };
      return { ok: false, error: json && !json.ok ? json.error : "Bad reply." };
    },
  };
}

import type { CatalogEntry, ListTotals, Sub } from "@/lib/sync-types";

/** Thrown when LeetCode rejected the cookie, so the UI can ask for a new one. */
export class ClientAuthError extends Error {
  constructor(message = "LeetCode rejected the cookie. Paste a fresh one in Settings.") {
    super(message);
    this.name = "ClientAuthError";
  }
}

type Cookie = { session: string; csrf?: string };

/** POST to one of our stateless /api/lc routes. The cookie rides along for that request only. */
async function call<T>(path: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/lc/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection.");
  }
  const json = (await res.json().catch(() => null)) as
    | ({ ok: true } & T)
    | { ok: false; error: string; authError?: boolean }
    | null;
  if (!json) throw new Error(`Unexpected response (${res.status}).`);
  if (!json.ok) {
    if (json.authError) throw new ClientAuthError(json.error);
    throw new Error(json.error);
  }
  return json;
}

export const whoami = (c: Cookie) => call<{ username: string | null }>("whoami", c);

export const solvedPage = (c: Cookie, skip: number) =>
  call<{ slugs: string[]; total: number }>("solved", { ...c, skip });

export const submissionsFor = (c: Cookie, slug: string) =>
  call<{ subs: Sub[] }>("submissions", { ...c, slug });

export const recentAccepted = (username: string, limit: number) =>
  call<{ recent: { slug: string; t: number }[] }>("recent", { username, limit });

export const catalogFor = (slugs: string[]) =>
  call<{ entries: Record<string, CatalogEntry>; totals: ListTotals; fetchedAt: number }>(
    "catalog",
    { slugs },
  );

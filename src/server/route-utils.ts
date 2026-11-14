import "server-only";
import { AuthError, type Cookie } from "./leetcode";

export class BadRequest extends Error {}

const TOKEN = /^[\w.\-+/=%]{4,4096}$/;

/** Pull and sanity-check the cookie the browser sent. It is used for this one request and never stored or logged. */
export function cookieFrom(body: unknown): Cookie {
  const b = (body ?? {}) as { session?: unknown; csrf?: unknown };
  if (typeof b.session !== "string" || typeof b.csrf !== "string") {
    throw new BadRequest("Missing cookie.");
  }
  if (!TOKEN.test(b.session) || !TOKEN.test(b.csrf)) {
    throw new BadRequest("That doesn't look like a LeetCode cookie value.");
  }
  return { session: b.session, csrf: b.csrf };
}

export const isSlug = (s: unknown): s is string =>
  typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,200}$/.test(s);

/** Run a handler on the JSON body and turn failures into `{ ok: false, error, authError }`. */
export async function handle(req: Request, fn: (body: unknown) => Promise<unknown>) {
  try {
    const body = await req.json().catch(() => ({}));
    return Response.json({ ok: true, ...((await fn(body)) as object) });
  } catch (e) {
    if (e instanceof AuthError) {
      return Response.json({ ok: false, error: e.message, authError: true }, { status: 401 });
    }
    if (e instanceof BadRequest) {
      return Response.json({ ok: false, error: e.message }, { status: 400 });
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not reach LeetCode." },
      { status: 502 },
    );
  }
}

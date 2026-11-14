import { connection } from "next/server";
import { AuthError, fetchUsername } from "@/server/leetcode";
import { FILES, loadCredentials, removeJson, writeJson } from "@/server/store";

/** Pull the two cookie values out of whatever was pasted: bare values, `name=value` pairs, or a whole Cookie header. */
function parseCookies(session: string, csrf: string) {
  const blob = `${session}; ${csrf}`;
  const pick = (name: string, fallback: string) => {
    const m = new RegExp(`${name}=([^;\\s]+)`).exec(blob);
    return (m ? m[1] : fallback).trim().replace(/^["']|["']$/g, "");
  };
  const bare = (s: string) => (s.includes("=") ? "" : s);
  return {
    session: pick("LEETCODE_SESSION", bare(session.trim())),
    csrf: pick("csrftoken", bare(csrf.trim())),
  };
}

/** Is a cookie saved, and for whom. Never returns the cookie itself. */
export async function GET() {
  await connection();
  const c = await loadCredentials();
  return Response.json({ connected: !!c, username: c?.username ?? null });
}

/** Check the pasted cookie with LeetCode, then save it locally (./data, git-ignored). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { session?: string; csrf?: string };
  const { session, csrf } = parseCookies(body.session ?? "", body.csrf ?? "");
  if (!session || !csrf) {
    return Response.json(
      { ok: false, error: "Paste both LEETCODE_SESSION and csrftoken." },
      { status: 400 },
    );
  }
  try {
    const username = await fetchUsername({ session, csrf });
    if (!username) {
      return Response.json(
        { ok: false, error: "LeetCode says that cookie isn't signed in. Copy it again." },
        { status: 401 },
      );
    }
    await writeJson(FILES.credentials, { session, csrf, username });
    return Response.json({ ok: true, username });
  } catch (e) {
    const status = e instanceof AuthError ? 401 : 502;
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not reach LeetCode." },
      { status },
    );
  }
}

/** Forget the cookie (synced submissions stay). */
export async function DELETE() {
  await removeJson(FILES.credentials);
  return Response.json({ ok: true });
}

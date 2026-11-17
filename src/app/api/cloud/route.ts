import { connection } from "next/server";
import {
  MAX_BYTES,
  applyChanges,
  cloudConfigured,
  dbHealth,
  missingConfig,
  readSince,
  syncKeyMatches,
  validChange,
  type InChange,
  type RemoteRow,
} from "@/server/cloud-store";

/**
 * The only door to your cloud copy. Every request must carry the sync key (PACER_SYNC_KEY);
 * without it the server hands over nothing. No accounts, no logins, just that one secret.
 */
function guard(req: Request): Response | null {
  if (!cloudConfigured()) {
    return Response.json(
      {
        ok: false,
        configured: false,
        missing: missingConfig(),
        error: "Cloud sync isn't set up on the server yet.",
      },
      { status: 503 },
    );
  }
  if (!syncKeyMatches(req.headers.get("x-sync-key"))) {
    return Response.json(
      { ok: false, configured: true, error: "That sync key isn't right." },
      { status: 401 },
    );
  }
  return null;
}

/** `?status` says whether the server is set up (no key needed). */
export async function GET(req: Request) {
  await connection();
  const configured = cloudConfigured();
  return Response.json({
    ok: true,
    configured,
    missing: missingConfig(),
    // only when everything is set: can the server actually reach its tables?
    ...(configured && new URL(req.url).searchParams.has("status") ? { db: await dbHealth() } : {}),
  });
}

/**
 * One sync: store the rows this computer changed, then return every row that changed in the cloud
 * since `cursor`. `rows` for rows just sent are the cloud's final answer for them.
 */
export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const text = await req.text();
  if (text.length > MAX_BYTES) {
    return Response.json({ ok: false, error: "That batch is too big to sync in one go." }, { status: 413 });
  }
  let body: { cursor?: unknown; first?: unknown; changes?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const changes = body.changes as InChange[];
  if (
    !(body.cursor === null || typeof body.cursor === "string") ||
    typeof body.first !== "boolean" ||
    !Array.isArray(changes) ||
    changes.length > 5000 ||
    !changes.every(validChange)
  ) {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (typeof body.cursor === "string" && Number.isNaN(Date.parse(body.cursor))) {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  try {
    const final = await applyChanges(changes, body.first);
    const delta = await readSince(body.cursor as string | null);
    // the answer for rows just sent wins over what the delta says
    const byId = new Map<string, RemoteRow>();
    for (const r of delta.rows) byId.set(`${r.table}|${r.key}`, r);
    for (const r of final) byId.set(`${r.table}|${r.key}`, r);
    return Response.json({ ok: true, rows: [...byId.values()], cursor: delta.cursor });
  } catch (e) {
    return Response.json(
      { ok: false, configured: true, error: e instanceof Error ? e.message : "Database error." },
      { status: 502 },
    );
  }
}

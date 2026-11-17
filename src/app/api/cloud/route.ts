import { connection } from "next/server";
import {
  MAX_BYTES,
  cloudConfigured,
  loadRow,
  parseSections,
  saveRow,
  syncKeyMatches,
} from "@/server/cloud-store";

/**
 * The only door to your cloud copy. Every request must carry the sync key (PACER_SYNC_KEY);
 * without it the server hands over nothing. No accounts, no logins, just that one secret.
 */
const NOT_CONFIGURED = {
  ok: false,
  configured: false,
  error: "Cloud sync isn't set up on the server yet.",
};

function guard(req: Request): Response | null {
  if (!cloudConfigured()) return Response.json(NOT_CONFIGURED, { status: 503 });
  if (!syncKeyMatches(req.headers.get("x-sync-key"))) {
    return Response.json(
      { ok: false, configured: true, error: "That sync key isn't right." },
      { status: 401 },
    );
  }
  return null;
}

/** `?status` says whether the server is set up (no key needed). Otherwise returns your data. */
export async function GET(req: Request) {
  await connection();
  if (new URL(req.url).searchParams.has("status")) {
    return Response.json({ ok: true, configured: cloudConfigured() });
  }
  const denied = guard(req);
  if (denied) return denied;
  try {
    return Response.json({ ok: true, configured: true, ...(await loadRow()) });
  } catch (e) {
    return Response.json(
      { ok: false, configured: true, error: e instanceof Error ? e.message : "Database error." },
      { status: 502 },
    );
  }
}

/** Store your data, but only if nobody else has changed it since `version`. */
export async function PUT(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const text = await req.text();
  if (text.length > MAX_BYTES) {
    return Response.json(
      { ok: false, error: "Your data is too big to sync in one go (over 4 MB)." },
      { status: 413 },
    );
  }
  let body: { data?: unknown; version?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const data = parseSections(body.data);
  if (!data || !(body.version === null || typeof body.version === "string")) {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const result = await saveRow(data, body.version as string | null);
  if (result.ok) return Response.json({ ok: true, version: result.version });
  if (result.conflict) {
    return Response.json({ ok: false, conflict: true, error: "Changed elsewhere." }, { status: 409 });
  }
  return Response.json({ ok: false, error: result.error }, { status: 502 });
}

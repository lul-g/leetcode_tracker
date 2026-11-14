import { connection } from "next/server";
import { getSyncState, startSync, type SyncMode } from "@/server/sync";
import { loadMeta } from "@/server/store";

async function status() {
  const meta = await loadMeta();
  return { ...getSyncState(), lastSyncedAt: meta.lastSyncedAt };
}

export async function GET() {
  await connection();
  return Response.json(await status());
}

/** Start a sync in the background; poll GET for progress. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { mode?: SyncMode };
  startSync(body.mode === "full" ? "full" : "incremental");
  return Response.json(await status());
}

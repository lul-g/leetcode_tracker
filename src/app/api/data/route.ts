import { connection } from "next/server";
import { buildPayload } from "@/server/payload";

export async function GET() {
  await connection(); // always read the local store fresh
  return Response.json(await buildPayload());
}

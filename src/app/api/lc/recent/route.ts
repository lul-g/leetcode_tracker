import { fetchRecentAccepted } from "@/server/leetcode";
import { BadRequest, handle } from "@/server/route-utils";

/** The user's latest accepted submissions (public data, so no cookie needed). */
export function POST(req: Request) {
  return handle(req, async (body) => {
    const { username, limit } = body as { username?: unknown; limit?: unknown };
    if (typeof username !== "string" || !/^[\w.\-]{1,64}$/.test(username)) {
      throw new BadRequest("Bad username.");
    }
    const n = Math.min(100, Math.max(1, Number(limit) || 50));
    return { recent: await fetchRecentAccepted(username, n) };
  });
}

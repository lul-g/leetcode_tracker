import { fetchUsername } from "@/server/leetcode";
import { cookieFrom, handle } from "@/server/route-utils";

/** Is this cookie a signed-in LeetCode session, and whose. Stateless: nothing is stored. */
export function POST(req: Request) {
  return handle(req, async (body) => ({ username: await fetchUsername(cookieFrom(body)) }));
}

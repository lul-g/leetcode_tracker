import { fetchSolvedPage } from "@/server/leetcode";
import { BadRequest, cookieFrom, handle } from "@/server/route-utils";

/** One page (100) of the problems this user has solved. The browser asks page by page. */
export function POST(req: Request) {
  return handle(req, async (body) => {
    const skip = Number((body as { skip?: unknown }).skip ?? 0);
    if (!Number.isInteger(skip) || skip < 0 || skip > 20000) throw new BadRequest("Bad page.");
    return fetchSolvedPage(cookieFrom(body), skip);
  });
}

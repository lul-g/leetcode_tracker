import { fetchSubmissions } from "@/server/leetcode";
import { BadRequest, cookieFrom, handle, isSlug } from "@/server/route-utils";

/** Every submission this user made to one problem. */
export function POST(req: Request) {
  return handle(req, async (body) => {
    const slug = (body as { slug?: unknown }).slug;
    if (!isSlug(slug)) throw new BadRequest("Bad problem.");
    return fetchSubmissions(cookieFrom(body), slug);
  });
}

import "server-only";
import { cacheLife } from "next/cache";
import { fetchCatalog } from "./leetcode";

/**
 * LeetCode's full problem catalog, cached on the server for weeks (it's public and barely
 * changes), so a sync normally doesn't have to download all ~4,000 problems again.
 */
export async function getCatalog() {
  "use cache";
  cacheLife("weeks");
  return { fetchedAt: Date.now(), problems: await fetchCatalog() };
}

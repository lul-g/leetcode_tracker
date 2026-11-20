import "server-only";
import { cacheLife } from "next/cache";
import { fetchCatalog } from "./leetcode";

/** bump when catalog entries gain fields, so the cached copy is rebuilt instead of served stale */
const CATALOG_SHAPE = 2;

/**
 * LeetCode's full problem catalog, cached on the server for weeks (it's public and barely
 * changes), so a sync normally doesn't have to download all ~4,000 problems again.
 */
export async function getCatalog(shape = CATALOG_SHAPE) {
  "use cache";
  cacheLife("weeks");
  void shape;
  return { fetchedAt: Date.now(), problems: await fetchCatalog() };
}

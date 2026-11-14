import type { Counts } from "@/lib/data";
import { slugsOfList } from "@/lib/lists-data";
import type { CatalogEntry, ListTotals } from "@/lib/sync-types";
import { getCatalog } from "@/server/catalog";
import { BadRequest, handle, isSlug } from "@/server/route-utils";

const NAMES = { 1: "easy", 2: "medium", 3: "hard" } as const;

function count(entries: CatalogEntry[]): Counts {
  const c: Counts = { easy: 0, medium: 0, hard: 0 };
  for (const e of entries) c[NAMES[e.d]]++;
  return c;
}

/**
 * Details for the problems you ask about, plus problems-per-difficulty for every list.
 * Backed by a server-side cache of LeetCode's public catalog.
 */
export function POST(req: Request) {
  return handle(req, async (body) => {
    const slugs = (body as { slugs?: unknown }).slugs;
    if (!Array.isArray(slugs) || slugs.length > 5000 || !slugs.every(isSlug)) {
      throw new BadRequest("Bad problem list.");
    }
    const { problems, fetchedAt } = await getCatalog();

    const entries: Record<string, CatalogEntry> = {};
    for (const s of slugs) if (problems[s]) entries[s] = problems[s];

    const totals: ListTotals = { goal: count(Object.values(problems)) };
    for (const id of ["blind75", "nc150"]) {
      const list = slugsOfList(id) ?? [];
      totals[id] = count(list.map((s) => problems[s]).filter(Boolean));
    }
    return { entries, totals, fetchedAt };
  });
}

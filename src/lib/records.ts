import type { Difficulty } from "@/lib/data";
import { listsOf, topicOf } from "@/lib/lists-data";
import type { CatalogEntry, ProblemRecord, Sub } from "@/lib/sync-types";

const LEVEL: Record<number, Difficulty> = { 1: "easy", 2: "medium", 3: "hard" };

const titleFromSlug = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Solved problems (at least one accepted submission) with their catalog details and list membership. */
export function buildRecords(
  subs: Record<string, Sub[]>,
  entries: Record<string, CatalogEntry>,
): ProblemRecord[] {
  const out: ProblemRecord[] = [];
  for (const [slug, list] of Object.entries(subs)) {
    if (!list.some((s) => s.ok)) continue;
    const e = entries[slug];
    out.push({
      slug,
      number: e?.n ?? 0,
      title: e?.title ?? titleFromSlug(slug),
      difficulty: LEVEL[e?.d ?? 2],
      topic: topicOf(slug),
      lists: listsOf(slug),
      subs: list.map((s) => ({ t: s.t, ok: s.ok, lang: s.lang, rt: s.rt })),
    });
  }
  return out;
}

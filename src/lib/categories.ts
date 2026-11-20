import { NEETCODE_150 } from "@/lib/lists-data";
import type { Problem } from "@/lib/problems";
import type { Annotation } from "@/lib/use-notes";

/** NeetCode's own categories, in their order. */
export const NEETCODE_CATEGORIES = Object.keys(NEETCODE_150);

/** What a problem is filed under when neither you nor NeetCode has said. */
export const UNCATEGORIZED = "Other";

/**
 * A problem's main category: yours if you set one, otherwise its NeetCode 150 category, otherwise
 * "Other". LeetCode's own topic tags (`problem.tags`) are the secondary labels.
 */
export const categoryOf = (p: Pick<Problem, "topic">, a: Pick<Annotation, "category">) =>
  a.category || p.topic || UNCATEGORIZED;

/** Categories you made up: any category set on a problem that NeetCode doesn't have. */
export function customCategories(all: Record<string, Annotation>): string[] {
  const nc = new Set(NEETCODE_CATEGORIES);
  const out = new Set<string>();
  for (const a of Object.values(all)) if (a.category && !nc.has(a.category) && a.category !== UNCATEGORIZED) out.add(a.category);
  return [...out].sort((a, b) => a.localeCompare(b));
}

import type { Difficulty } from "@/lib/data";
import { listsOf, topicOf } from "@/lib/lists-data";
import type { ManualSolve, ProblemRecord } from "@/lib/sync-types";
import { localDateOf } from "@/lib/pace";

export type Problem = {
  slug: string;
  /** LeetCode problem number */
  number: number;
  title: string;
  difficulty: Difficulty;
  /** NeetCode 150 category */
  topic: string;
  /** LeetCode's own topic tags (secondary to the category) */
  tags: string[];
  /** ids of the lists this problem belongs to (see LISTS in data.ts) */
  lists: string[];
  /** local date of the first accepted submission (YYYY-MM-DD) */
  solvedAt: string;
  /** DEMO: submissions it took */
  attempts: number;
  lang: string;
  runtimeMs: number;
  /** logged by hand rather than synced from LeetCode */
  manual?: boolean;
};


// DEMO ONLY: replaced by the synced submission history. 20 solves over 14 days.
const DEMO: Omit<Problem, "tags">[] = [
  { slug: "contains-duplicate", number: 217, title: "Contains Duplicate", difficulty: "easy", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-02", attempts: 1, lang: "Python3", runtimeMs: 12 },
  { slug: "valid-anagram", number: 242, title: "Valid Anagram", difficulty: "easy", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-03", attempts: 2, lang: "Python3", runtimeMs: 38 },
  { slug: "two-sum", number: 1, title: "Two Sum", difficulty: "easy", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-03", attempts: 1, lang: "Python3", runtimeMs: 7 },
  { slug: "group-anagrams", number: 49, title: "Group Anagrams", difficulty: "medium", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-05", attempts: 3, lang: "Python3", runtimeMs: 92 },
  { slug: "valid-palindrome", number: 125, title: "Valid Palindrome", difficulty: "easy", topic: "Two Pointers", lists: [], solvedAt: "2026-11-06", attempts: 2, lang: "Python3", runtimeMs: 31 },
  { slug: "top-k-frequent-elements", number: 347, title: "Top K Frequent Elements", difficulty: "medium", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-06", attempts: 2, lang: "Python3", runtimeMs: 64 },
  { slug: "product-of-array-except-self", number: 238, title: "Product of Array Except Self", difficulty: "medium", topic: "Arrays & Hashing", lists: [], solvedAt: "2026-11-06", attempts: 4, lang: "Python3", runtimeMs: 148 },
  { slug: "two-sum-ii-input-array-is-sorted", number: 167, title: "Two Sum II - Input Array Is Sorted", difficulty: "medium", topic: "Two Pointers", lists: [], solvedAt: "2026-11-07", attempts: 1, lang: "Python3", runtimeMs: 55 },
  { slug: "3sum", number: 15, title: "3Sum", difficulty: "medium", topic: "Two Pointers", lists: [], solvedAt: "2026-11-07", attempts: 5, lang: "Python3", runtimeMs: 511 },
  { slug: "best-time-to-buy-and-sell-stock", number: 121, title: "Best Time to Buy and Sell Stock", difficulty: "easy", topic: "Sliding Window", lists: [], solvedAt: "2026-11-09", attempts: 1, lang: "Python3", runtimeMs: 66 },
  { slug: "longest-substring-without-repeating-characters", number: 3, title: "Longest Substring Without Repeating Characters", difficulty: "medium", topic: "Sliding Window", lists: [], solvedAt: "2026-11-09", attempts: 3, lang: "Python3", runtimeMs: 47 },
  { slug: "valid-parentheses", number: 20, title: "Valid Parentheses", difficulty: "easy", topic: "Stack", lists: [], solvedAt: "2026-11-10", attempts: 1, lang: "Python3", runtimeMs: 9 },
  { slug: "container-with-most-water", number: 11, title: "Container With Most Water", difficulty: "medium", topic: "Two Pointers", lists: [], solvedAt: "2026-11-11", attempts: 2, lang: "Python3", runtimeMs: 402 },
  { slug: "trapping-rain-water", number: 42, title: "Trapping Rain Water", difficulty: "hard", topic: "Two Pointers", lists: [], solvedAt: "2026-11-11", attempts: 6, lang: "Python3", runtimeMs: 38 },
  { slug: "min-stack", number: 155, title: "Min Stack", difficulty: "medium", topic: "Stack", lists: [], solvedAt: "2026-11-11", attempts: 2, lang: "Python3", runtimeMs: 52 },
  { slug: "daily-temperatures", number: 739, title: "Daily Temperatures", difficulty: "medium", topic: "Stack", lists: [], solvedAt: "2026-11-12", attempts: 3, lang: "Python3", runtimeMs: 430 },
  { slug: "binary-search", number: 704, title: "Binary Search", difficulty: "easy", topic: "Binary Search", lists: [], solvedAt: "2026-11-12", attempts: 1, lang: "Python3", runtimeMs: 183 },
  { slug: "search-a-2d-matrix", number: 74, title: "Search a 2D Matrix", difficulty: "medium", topic: "Binary Search", lists: [], solvedAt: "2026-11-13", attempts: 2, lang: "Python3", runtimeMs: 41 },
  { slug: "koko-eating-bananas", number: 875, title: "Koko Eating Bananas", difficulty: "medium", topic: "Binary Search", lists: [], solvedAt: "2026-11-14", attempts: 4, lang: "Python3", runtimeMs: 263 },
  { slug: "largest-rectangle-in-histogram", number: 84, title: "Largest Rectangle in Histogram", difficulty: "hard", topic: "Stack", lists: [], solvedAt: "2026-11-14", attempts: 7, lang: "Python3", runtimeMs: 1150 },
];

export const PROBLEMS: Problem[] = DEMO.map((p) => ({
  ...p,
  tags: [],
  topic: topicOf(p.slug),
  lists: listsOf(p.slug),
}));

/**
 * Turn the server's records into the problems that count: those with an accepted submission on
 * or after `startDate` (local days). Re-solving an old problem after the start date counts it,
 * dated by that new solve.
 */
export function buildProblems(
  records: ProblemRecord[],
  startDate: string,
  manual: ManualSolve[] = [],
): Problem[] {
  const out: Problem[] = [];
  for (const r of records) {
    const first = r.subs.find((s) => s.ok && localDateOf(s.t) >= startDate);
    if (!first) continue;
    const solvedAt = localDateOf(first.t);
    out.push({
      slug: r.slug,
      number: r.number,
      title: r.title,
      difficulty: r.difficulty,
      topic: r.topic,
      tags: r.tags ?? [],
      lists: r.lists,
      solvedAt,
      // submissions since the start date, up to and including the one that counted
      attempts: r.subs.filter((s) => localDateOf(s.t) >= startDate && s.t <= first.t).length,
      lang: first.lang,
      runtimeMs: first.rt ?? 0,
    });
  }

  // Problems you logged by hand. A synced solve of the same problem wins, so solving it on
  // LeetCode later (say you buy premium) never counts it twice.
  const have = new Set(out.map((p) => p.slug));
  for (const m of manual) {
    if (have.has(m.slug) || m.solvedAt < startDate) continue;
    out.push({
      slug: m.slug,
      number: m.number,
      title: m.title,
      difficulty: m.difficulty,
      topic: topicOf(m.slug),
      tags: [],
      lists: listsOf(m.slug),
      solvedAt: m.solvedAt,
      attempts: 1,
      lang: "",
      runtimeMs: 0,
      manual: true,
    });
  }
  return out;
}

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;

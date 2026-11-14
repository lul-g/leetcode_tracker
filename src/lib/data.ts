export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: { id: Difficulty; label: string; short: string }[] = [
  { id: "easy", label: "Easy", short: "Easy" },
  { id: "medium", label: "Medium", short: "Med." },
  { id: "hard", label: "Hard", short: "Hard" },
];

export type Counts = Record<Difficulty, number>;

export type ProblemList = {
  id: string;
  name: string;
  emoji: string;
  /** progress bar color (any CSS color) */
  bar: string;
  /** problems in the list, per difficulty */
  totals: Counts;
  /** DEMO ONLY: replaced by real solves once the sync exists */
  solved: Counts;
};

// TODO: replace totals/solved with data derived from real slug lists + synced solves.
// NeetCode 150 totals come from neetcode.io; the others are placeholders.
export const LISTS: ProblemList[] = [
  {
    id: "goal",
    name: "My Goal",
    emoji: "🎯",
    bar: "var(--solved)",
    totals: { easy: 975, medium: 2146, hard: 989 }, // all of LeetCode
    solved: { easy: 8, medium: 17, hard: 1 },
  },
  {
    id: "blind75",
    name: "Blind 75",
    emoji: "🧠",
    bar: "#22c55e",
    totals: { easy: 12, medium: 49, hard: 14 },
    solved: { easy: 3, medium: 2, hard: 0 },
  },
  {
    id: "nc150",
    name: "NeetCode 150",
    emoji: "🚀",
    bar: "#ffa116",
    totals: { easy: 28, medium: 101, hard: 21 },
    solved: { easy: 3, medium: 2, hard: 0 },
  },
  {
    id: "nc250",
    name: "NeetCode 250",
    emoji: "🦄",
    bar: "#ef4743",
    totals: { easy: 40, medium: 160, hard: 50 },
    solved: { easy: 3, medium: 2, hard: 0 },
  },
  {
    id: "ncall",
    name: "NeetCode All",
    emoji: "🌍",
    bar: "#3b82f6",
    totals: { easy: 80, medium: 220, hard: 70 },
    solved: { easy: 3, medium: 2, hard: 0 },
  },
];

export const DEFAULT_GOAL = 1200;

export type Problem = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  lists: string[];
  solvedAt: string;
};

// DEMO ONLY
export const DEMO_PROBLEMS: Problem[] = [
  { slug: "top-k-frequent-elements", title: "Top K Frequent Elements", difficulty: "medium", lists: ["goal", "nc150", "nc250", "ncall"], solvedAt: "2026-11-14" },
  { slug: "group-anagrams", title: "Group Anagrams", difficulty: "medium", lists: ["goal", "blind75", "nc150", "nc250", "ncall"], solvedAt: "2026-11-12" },
  { slug: "valid-anagram", title: "Valid Anagram", difficulty: "easy", lists: ["goal", "blind75", "nc150", "nc250", "ncall"], solvedAt: "2026-11-11" },
  { slug: "contains-duplicate", title: "Contains Duplicate", difficulty: "easy", lists: ["goal", "blind75", "nc150", "nc250", "ncall"], solvedAt: "2026-11-09" },
  { slug: "two-sum", title: "Two Sum", difficulty: "easy", lists: ["goal", "blind75", "nc150", "nc250", "ncall"], solvedAt: "2026-11-07" },
  { slug: "trapping-rain-water", title: "Trapping Rain Water", difficulty: "hard", lists: ["goal", "nc150", "nc250", "ncall"], solvedAt: "2026-11-03" },
];

/** NeetCode 150 categories and how many problems each has (sums to 150). */
export const TOPICS: { name: string; total: number }[] = [
  { name: "Arrays & Hashing", total: 9 },
  { name: "Two Pointers", total: 5 },
  { name: "Sliding Window", total: 6 },
  { name: "Stack", total: 7 },
  { name: "Binary Search", total: 7 },
  { name: "Linked List", total: 11 },
  { name: "Trees", total: 15 },
  { name: "Heap / Priority Queue", total: 7 },
  { name: "Backtracking", total: 9 },
  { name: "Tries", total: 3 },
  { name: "Graphs", total: 13 },
  { name: "Advanced Graphs", total: 6 },
  { name: "1-D DP", total: 12 },
  { name: "2-D DP", total: 11 },
  { name: "Greedy", total: 8 },
  { name: "Intervals", total: 6 },
  { name: "Math & Geometry", total: 8 },
  { name: "Bit Manipulation", total: 7 },
];

// DEMO ONLY: solves per day from 2026-11-01, replaced by synced submissions.
const DEMO_PER_DAY = [0, 1, 2, 0, 1, 3, 2, 0, 2, 1, 3, 2, 1, 2];
const DEMO_CYCLE: Difficulty[] = ["easy", "medium", "medium", "easy", "medium", "hard"];
const DEMO_TOPICS = [
  "Arrays & Hashing", "Arrays & Hashing", "Two Pointers", "Arrays & Hashing", "Sliding Window",
  "Stack", "Two Pointers", "Binary Search", "Arrays & Hashing", "Linked List",
  "Stack", "Trees", "Sliding Window", "Arrays & Hashing", "Binary Search",
  "Two Pointers", "Linked List", "Arrays & Hashing", "Stack", "Heap / Priority Queue",
];
export const DEMO_SOLVES: { date: string; difficulty: Difficulty; topic: string }[] = (() => {
  const out: { date: string; difficulty: Difficulty; topic: string }[] = [];
  let i = 0;
  DEMO_PER_DAY.forEach((n, d) => {
    for (let k = 0; k < n; k++) {
      out.push({
        date: `2026-11-${String(d + 1).padStart(2, "0")}`,
        difficulty: DEMO_CYCLE[i % DEMO_CYCLE.length],
        topic: DEMO_TOPICS[i % DEMO_TOPICS.length],
      });
      i++;
    }
  });
  return out;
})();

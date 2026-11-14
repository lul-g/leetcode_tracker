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
];

export const DEFAULT_GOAL = 1200;

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

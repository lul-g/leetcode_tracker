/**
 * Curated problem lists as LeetCode slugs. Written from memory of the public NeetCode 150 and
 * Blind 75 lists, so a slug can be off by one problem; fix it here and everything follows.
 * NeetCode 250 / All are not included yet: they need an actual export of those lists.
 */

/** NeetCode 150, grouped by its 18 categories (in NeetCode's order). */
export const NEETCODE_150: Record<string, string[]> = {
  "Arrays & Hashing": [
    "contains-duplicate", "valid-anagram", "two-sum", "group-anagrams", "top-k-frequent-elements",
    "encode-and-decode-strings", "product-of-array-except-self", "valid-sudoku", "longest-consecutive-sequence",
  ],
  "Two Pointers": [
    "valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water", "trapping-rain-water",
  ],
  "Sliding Window": [
    "best-time-to-buy-and-sell-stock", "longest-substring-without-repeating-characters",
    "longest-repeating-character-replacement", "permutation-in-string", "minimum-window-substring",
    "sliding-window-maximum",
  ],
  Stack: [
    "valid-parentheses", "min-stack", "evaluate-reverse-polish-notation", "generate-parentheses",
    "daily-temperatures", "car-fleet", "largest-rectangle-in-histogram",
  ],
  "Binary Search": [
    "binary-search", "search-a-2d-matrix", "koko-eating-bananas", "find-minimum-in-rotated-sorted-array",
    "search-in-rotated-sorted-array", "time-based-key-value-store", "median-of-two-sorted-arrays",
  ],
  "Linked List": [
    "reverse-linked-list", "merge-two-sorted-lists", "reorder-list", "remove-nth-node-from-end-of-list",
    "copy-list-with-random-pointer", "add-two-numbers", "linked-list-cycle", "find-the-duplicate-number",
    "lru-cache", "merge-k-sorted-lists", "reverse-nodes-in-k-group",
  ],
  Trees: [
    "invert-binary-tree", "maximum-depth-of-binary-tree", "diameter-of-binary-tree", "balanced-binary-tree",
    "same-tree", "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-search-tree",
    "binary-tree-level-order-traversal", "binary-tree-right-side-view", "count-good-nodes-in-binary-tree",
    "validate-binary-search-tree", "kth-smallest-element-in-a-bst",
    "construct-binary-tree-from-preorder-and-inorder-traversal", "binary-tree-maximum-path-sum",
    "serialize-and-deserialize-binary-tree",
  ],
  "Heap / Priority Queue": [
    "kth-largest-element-in-a-stream", "last-stone-weight", "k-closest-points-to-origin",
    "kth-largest-element-in-an-array", "task-scheduler", "design-twitter", "find-median-from-data-stream",
  ],
  Backtracking: [
    "subsets", "combination-sum", "permutations", "subsets-ii", "combination-sum-ii", "word-search",
    "palindrome-partitioning", "letter-combinations-of-a-phone-number", "n-queens",
  ],
  Tries: [
    "implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii",
  ],
  Graphs: [
    "number-of-islands", "max-area-of-island", "clone-graph", "walls-and-gates", "rotting-oranges",
    "pacific-atlantic-water-flow", "surrounded-regions", "course-schedule", "course-schedule-ii",
    "redundant-connection", "number-of-connected-components-in-an-undirected-graph", "graph-valid-tree",
    "word-ladder",
  ],
  "Advanced Graphs": [
    "reconstruct-itinerary", "min-cost-to-connect-all-points", "network-delay-time", "swim-in-rising-water",
    "alien-dictionary", "cheapest-flights-within-k-stops",
  ],
  "1-D DP": [
    "climbing-stairs", "min-cost-climbing-stairs", "house-robber", "house-robber-ii",
    "longest-palindromic-substring", "palindromic-substrings", "decode-ways", "coin-change",
    "maximum-product-subarray", "word-break", "longest-increasing-subsequence", "partition-equal-subset-sum",
  ],
  "2-D DP": [
    "unique-paths", "longest-common-subsequence", "best-time-to-buy-and-sell-stock-with-cooldown",
    "coin-change-ii", "target-sum", "interleaving-string", "longest-increasing-path-in-a-matrix",
    "distinct-subsequences", "edit-distance", "burst-balloons", "regular-expression-matching",
  ],
  Greedy: [
    "maximum-subarray", "jump-game", "jump-game-ii", "gas-station", "hand-of-straights",
    "merge-triplets-to-form-target-triplet", "partition-labels", "valid-parenthesis-string",
  ],
  Intervals: [
    "insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii",
    "minimum-interval-to-include-each-query",
  ],
  "Math & Geometry": [
    "rotate-image", "spiral-matrix", "set-matrix-zeroes", "happy-number", "plus-one", "powx-n",
    "multiply-strings", "detect-squares",
  ],
  "Bit Manipulation": [
    "single-number", "number-of-1-bits", "counting-bits", "reverse-bits", "missing-number",
    "sum-of-two-integers", "reverse-integer",
  ],
};

export const BLIND_75: string[] = [
  "two-sum", "best-time-to-buy-and-sell-stock", "contains-duplicate", "product-of-array-except-self",
  "maximum-subarray", "maximum-product-subarray", "find-minimum-in-rotated-sorted-array",
  "search-in-rotated-sorted-array", "3sum", "container-with-most-water", "sum-of-two-integers",
  "number-of-1-bits", "counting-bits", "missing-number", "reverse-bits", "climbing-stairs", "coin-change",
  "longest-increasing-subsequence", "longest-common-subsequence", "word-break", "combination-sum",
  "house-robber", "house-robber-ii", "decode-ways", "unique-paths", "jump-game", "clone-graph",
  "course-schedule", "pacific-atlantic-water-flow", "number-of-islands", "longest-consecutive-sequence",
  "alien-dictionary", "graph-valid-tree", "number-of-connected-components-in-an-undirected-graph",
  "insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii",
  "reverse-linked-list", "linked-list-cycle", "merge-two-sorted-lists", "merge-k-sorted-lists",
  "remove-nth-node-from-end-of-list", "reorder-list", "set-matrix-zeroes", "spiral-matrix", "rotate-image",
  "word-search", "longest-substring-without-repeating-characters", "longest-repeating-character-replacement",
  "minimum-window-substring", "valid-anagram", "group-anagrams", "valid-parentheses", "valid-palindrome",
  "longest-palindromic-substring", "palindromic-substrings", "encode-and-decode-strings",
  "maximum-depth-of-binary-tree", "same-tree", "invert-binary-tree", "binary-tree-maximum-path-sum",
  "binary-tree-level-order-traversal", "serialize-and-deserialize-binary-tree", "subtree-of-another-tree",
  "construct-binary-tree-from-preorder-and-inorder-traversal", "validate-binary-search-tree",
  "kth-smallest-element-in-a-bst", "lowest-common-ancestor-of-a-binary-search-tree",
  "implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "word-search-ii",
  "top-k-frequent-elements", "find-median-from-data-stream",
];

/** slug -> NeetCode 150 category */
const CATEGORY = new Map<string, string>();
for (const [cat, slugs] of Object.entries(NEETCODE_150)) for (const s of slugs) CATEGORY.set(s, cat);
const BLIND = new Set(BLIND_75);

export const NC150_SLUGS = [...CATEGORY.keys()];
export const BLIND75_SLUGS = [...BLIND];

/** NeetCode category for a problem, or "Other" when it isn't in the NeetCode 150. */
export const topicOf = (slug: string) => CATEGORY.get(slug) ?? "Other";

/** ids (see LISTS in data.ts) of every list a problem belongs to; "goal" always includes it. */
export function listsOf(slug: string): string[] {
  const out = ["goal"];
  if (BLIND.has(slug)) out.push("blind75");
  if (CATEGORY.has(slug)) out.push("nc150");
  return out;
}

/** Slugs for a list id, or null for lists with no slug data ("goal" = every problem). */
export function slugsOfList(id: string): string[] | null {
  if (id === "blind75") return BLIND75_SLUGS;
  if (id === "nc150") return NC150_SLUGS;
  return null;
}

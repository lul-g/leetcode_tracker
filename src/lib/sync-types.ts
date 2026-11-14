import type { Counts, Difficulty } from "@/lib/data";

/** One submission to a problem. */
export type Sub = {
  id: string;
  /** epoch seconds */
  t: number;
  ok: boolean;
  lang: string;
  /** runtime in ms, null when unknown */
  rt: number | null;
};

/** What the browser keeps for LeetCode access. Lives in localStorage; the server never stores it. */
export type Credentials = {
  session: string;
  /** optional: LeetCode does not require it, so it is usually empty */
  csrf?: string;
  username: string | null;
};

/** What we know about a problem from LeetCode's catalog. */
export type CatalogEntry = {
  /** frontend id shown on LeetCode */
  n: number;
  title: string;
  /** 1 easy, 2 medium, 3 hard */
  d: 1 | 2 | 3;
};

/** Problems per difficulty for each list that has slug data (plus "goal" = all of LeetCode). */
export type ListTotals = Record<string, Counts>;

/** One solved problem, ready to turn into a `Problem` once a start date is known. */
export type ProblemRecord = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
  lists: string[];
  /** every submission to the problem, oldest first */
  subs: Pick<Sub, "t" | "ok" | "lang" | "rt">[];
};

export type SyncMode = "incremental" | "full";

/** What the last sync found, shown in Settings so a "nothing solved" screen can be explained. */
export type SyncSummary = {
  /** problems LeetCode reports as solved for this session */
  solvedOnLeetCode: number;
  /** of those, how many have at least one accepted submission downloaded */
  withAccepted: number;
  /** solved problems for which LeetCode returned no submissions at all */
  emptyFetches: number;
  /** newest accepted submission, epoch seconds */
  newestAcceptedAt: number | null;
};

export type SyncStatus = {
  running: boolean;
  mode: SyncMode | null;
  phase: string;
  done: number;
  total: number;
  error: string | null;
  /** true when LeetCode rejected the cookie, so the UI asks for a new one */
  authError: boolean;
  /** started by the app itself (on open or tab focus) rather than by a click: stays quiet */
  auto: boolean;
};

import type { Counts, Difficulty } from "@/lib/data";

/** One solved problem as the server sends it; the client turns this into a `Problem`. */
export type ProblemRecord = {
  slug: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topic: string;
  lists: string[];
  /** every submission to the problem, oldest first */
  subs: { t: number; ok: boolean; lang: string; rt: number | null }[];
};

export type DataPayload = {
  connected: boolean;
  username: string | null;
  lastSyncedAt: number | null;
  hasData: boolean;
  problems: ProblemRecord[];
  /** problems per difficulty for each list that has slug data; null until the catalog is downloaded */
  listTotals: Record<string, Counts> | null;
};

export type SyncStatus = {
  running: boolean;
  mode: "incremental" | "full" | null;
  phase: string;
  done: number;
  total: number;
  error: string | null;
  authError: boolean;
  finishedAt: number | null;
  lastSyncedAt: number | null;
};

"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LISTS,
  type Counts,
  type Difficulty,
  type ProblemList,
} from "@/lib/data";
import type { GoalSettings, Solve } from "@/lib/pace";
import { PROBLEMS, buildProblems, type Problem } from "@/lib/problems";
import type { SyncStatus } from "@/lib/sync-types";
import { useSettings } from "@/lib/use-settings";
import { useSyncedData } from "@/lib/use-synced-data";

export type SettingsTab = "goal" | "leetcode";

type AppState = {
  settings: GoalSettings;
  updateSettings: (s: GoalSettings) => void;
  /** local date; null until the page has mounted */
  today: string | null;
  /** only problems solved on/after the start date */
  problems: Problem[];
  solves: Solve[];
  /** lists with solved counts derived from `problems` */
  lists: ProblemList[];
  listId: string;
  setListId: (id: string) => void;
  list: ProblemList;
  /** sticky difficulty filter shared by every page */
  difficulty: Difficulty | null;
  setDifficulty: (d: Difficulty | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsTab: SettingsTab;
  /** open the settings dialog on a tab */
  openSettings: (tab?: SettingsTab) => void;
  /** true until a first sync has brought in real data */
  isDemo: boolean;
  /** false until the first /api/data response arrives */
  dataLoaded: boolean;
  connection: { connected: boolean; username: string | null; lastSyncedAt: number | null };
  syncStatus: SyncStatus;
  sync: (mode?: "incremental" | "full") => Promise<void>;
  connect: (session: string, csrf: string) => Promise<string | null>;
  disconnect: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { settings, update, today } = useSettings();
  const [listId, setListId] = useState("goal");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("goal");
  const synced = useSyncedData();
  const isDemo = !synced.hasData;

  // Only solves on/after the start date count toward the goal. Real data once a sync has
  // happened, otherwise the built-in demo so the app isn't empty.
  const problems = useMemo(
    () =>
      isDemo
        ? PROBLEMS.filter((p) => p.solvedAt >= settings.startDate)
        : buildProblems(synced.records, settings.startDate),
    [isDemo, synced.records, settings.startDate],
  );
  const solves = useMemo<Solve[]>(
    () => problems.map((p) => ({ date: p.solvedAt, difficulty: p.difficulty, topic: p.topic })),
    [problems],
  );
  const listTotals = synced.listTotals;
  const lists = useMemo(
    () =>
      LISTS.map((l) => {
        const solved: Counts = { easy: 0, medium: 0, hard: 0 };
        for (const p of problems) if (p.lists.includes(l.id)) solved[p.difficulty]++;
        return { ...l, solved, totals: listTotals?.[l.id] ?? l.totals };
      }),
    [problems, listTotals],
  );
  const list = lists.find((l) => l.id === listId) ?? lists[0];

  const value: AppState = {
    settings,
    updateSettings: update,
    today,
    problems,
    solves,
    lists,
    listId,
    setListId,
    list,
    difficulty,
    setDifficulty,
    settingsOpen,
    setSettingsOpen,
    settingsTab,
    openSettings: (tab) => {
      if (tab) setSettingsTab(tab);
      setSettingsOpen(true);
    },
    isDemo,
    dataLoaded: synced.ready,
    connection: {
      connected: synced.connected,
      username: synced.username,
      lastSyncedAt: synced.lastSyncedAt,
    },
    syncStatus: synced.status,
    sync: synced.sync,
    connect: synced.connect,
    disconnect: synced.disconnect,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

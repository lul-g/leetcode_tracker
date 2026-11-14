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
import { PROBLEMS, type Problem } from "@/lib/problems";
import { useSettings } from "@/lib/use-settings";

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

  // Only solves on/after the start date count toward the goal.
  const problems = useMemo(
    () => PROBLEMS.filter((p) => p.solvedAt >= settings.startDate),
    [settings.startDate],
  );
  const solves = useMemo<Solve[]>(
    () => problems.map((p) => ({ date: p.solvedAt, difficulty: p.difficulty, topic: p.topic })),
    [problems],
  );
  const lists = useMemo(
    () =>
      LISTS.map((l) => {
        const solved: Counts = { easy: 0, medium: 0, hard: 0 };
        for (const p of problems) if (p.lists.includes(l.id)) solved[p.difficulty]++;
        return { ...l, solved };
      }),
    [problems],
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
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

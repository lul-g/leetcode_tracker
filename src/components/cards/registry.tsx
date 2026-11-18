"use client";

import type { ReactNode } from "react";
import { HeatmapCard } from "@/components/heatmap-card";
import { PacePanel } from "@/components/pace-panel";
import { RangeCard } from "@/components/range-card";
import { StreakCalendarCard } from "@/components/streak-calendar-card";
import { TodayCard } from "@/components/today-card";
import { TopicsCard } from "@/components/topics-card";
import {
  HistoryCard,
  OverviewCard,
  PerDayCard,
  PeriodChartCard,
  TargetCard,
} from "@/components/targets/period-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/app-context";
import { HeroCard } from "./hero-card";
import { RecentCard } from "./recent-card";

export type CardDef = {
  label: string;
  description: string;
  node: ReactNode;
};

/**
 * Every card the app has, keyed by id. The dashboard lets you choose which to show;
 * the Progress and Topics pages group the relevant ones.
 * The sticky difficulty filter narrows every card that shows activity. Goal math
 * (pace, today) always uses all difficulties, since the goal counts them all.
 */
export function useCards(opts: { periodSwitch?: boolean } = {}): Record<string, CardDef> {
  const periodSwitch = opts.periodSwitch ?? true;
  const { settings, today, solves, difficulty, openSettings } = useApp();
  const filtered = difficulty ? solves.filter((s) => s.difficulty === difficulty) : solves;

  // `today` is only known after mount, so cards that need it show a skeleton first.
  const ready = (render: (today: string) => ReactNode) =>
    today ? render(today) : <Skeleton className="h-full w-full rounded-xl" />;

  return {
    hero: {
      label: "Progress ring",
      description: "Solved vs. total, by difficulty",
      node: <HeroCard />,
    },
    pace: {
      label: "Pace",
      description: "Ahead or behind, burn-up chart, projected finish",
      node: ready((t) => (
        <PacePanel
          solves={solves}
          settings={settings}
          onEditGoal={() => openSettings("goal")}
          today={t}
          difficulty={difficulty}
        />
      )),
    },
    today: {
      label: "Today",
      description: "Today's solves vs. what you need",
      node: ready((t) => <TodayCard solves={solves} settings={settings} today={t} />),
    },
    range: {
      label: "Activity",
      description: "Week to all-time, stacked by difficulty",
      node: ready((t) => (
        <RangeCard
          solves={filtered}
          startDate={settings.startDate}
          today={t}
          difficulty={difficulty}
        />
      )),
    },
    calendar: {
      label: "Calendar",
      description: "Monthly view with streaks",
      node: ready((t) => (
        <StreakCalendarCard solves={filtered} startDate={settings.startDate} today={t} />
      )),
    },
    heatmap: {
      label: "Consistency",
      description: "A year of activity",
      node: ready((t) => (
        <HeatmapCard solves={filtered} startDate={settings.startDate} today={t} />
      )),
    },
    topics: {
      label: "Topics",
      description: "NeetCode 150 categories",
      node: ready((t) => (
        <TopicsCard solves={filtered} startDate={settings.startDate} today={t} />
      )),
    },
    // period targets: goal math, so they use every difficulty
    "p-target": {
      label: "Period target",
      description: "What you need this week/month/quarter to be on pace",
      node: ready((t) => <TargetCard solves={solves} settings={settings} today={t} showSwitch={periodSwitch} />),
    },
    "p-perday": {
      label: "Per work day",
      description: "What's needed each work day until the period ends",
      node: ready((t) => <PerDayCard solves={solves} settings={settings} today={t} showSwitch={periodSwitch} />),
    },
    "p-chart": {
      label: "Period chart",
      description: "Solved vs. normal pace, day by day or week by week",
      node: ready((t) => (
        <PeriodChartCard solves={solves} settings={settings} today={t} showSwitch={periodSwitch} />
      )),
    },
    "p-history": {
      label: "Period history",
      description: "How the last weeks/months went",
      node: ready((t) => <HistoryCard solves={solves} settings={settings} today={t} showSwitch={periodSwitch} />),
    },
    "p-overview": {
      label: "All periods",
      description: "Week, month, quarter and 6 mo at a glance",
      node: ready((t) => <OverviewCard solves={solves} settings={settings} today={t} />),
    },
    recent: {
      label: "Recent solves",
      description: "Latest problems in the active list",
      node: <RecentCard />,
    },
  };
}

"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
import { addDays, daysBetween, type SeriesPoint } from "@/lib/pace";

const COLOR: Record<Difficulty, string> = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
};

const short = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const long = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

type Props = {
  goal: number;
  startDate: string;
  targetDate: string;
  today: string;
  actual: SeriesPoint[];
  /** cumulative for the sticky difficulty filter, drawn as an extra line */
  filtered?: { series: SeriesPoint[]; difficulty: Difficulty } | null;
  /** solves per day used to extend the dashed projection */
  pace: number;
};

export function BurnUpChart({
  goal,
  startDate,
  targetDate,
  today,
  actual,
  filtered,
  pace,
}: Props) {
  const lastDay = Math.max(1, daysBetween(startDate, targetDate));
  const todayIdx = Math.min(lastDay, Math.max(0, daysBetween(startDate, today)));
  const solved = actual.at(-1)?.total ?? 0;
  const totalDays = lastDay + 1;

  const data = useMemo(() => {
    const rows = [];
    for (let day = 0; day <= lastDay; day++) {
      rows.push({
        date: addDays(startDate, day),
        ideal: Math.round(((goal * (day + 1)) / totalDays) * 10) / 10,
        actual: day <= todayIdx ? (actual[day]?.total ?? solved) : null,
        projected:
          day >= todayIdx && solved < goal
            ? Math.min(goal, Math.round((solved + pace * (day - todayIdx)) * 10) / 10)
            : null,
        filtered:
          filtered && day <= todayIdx
            ? (filtered.series[day]?.total ?? null)
            : null,
      });
    }
    return rows;
  }, [lastDay, startDate, goal, totalDays, todayIdx, actual, solved, pace, filtered]);

  const filterLabel = filtered
    ? DIFFICULTIES.find((d) => d.id === filtered.difficulty)!.label
    : "";
  const config = {
    actual: { label: "Solved", color: "var(--solved)" },
    projected: { label: "Projected", color: "var(--solved)" },
    ideal: { label: "Ideal", color: "var(--muted-foreground)" },
    filtered: {
      label: filterLabel,
      color: filtered ? COLOR[filtered.difficulty] : "var(--muted-foreground)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto min-h-0 w-full flex-1">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fill-actual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--solved)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--solved)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={short}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={48}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, goal]}
          ticks={[0, Math.round(goal / 2), goal]}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => long(String(p?.[0]?.payload?.date ?? ""))}
            />
          }
        />
        <ReferenceLine y={goal} stroke="var(--border)" />
        <ReferenceLine
          x={data[todayIdx]?.date}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.45}
          strokeDasharray="3 3"
        />
        <Area
          dataKey="actual"
          type="monotone"
          stroke="var(--color-actual)"
          strokeWidth={2.5}
          fill="url(#fill-actual)"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="ideal"
          type="linear"
          stroke="var(--color-ideal)"
          strokeWidth={1.5}
          strokeDasharray="1 4"
          strokeLinecap="round"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="projected"
          type="linear"
          stroke="var(--color-projected)"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeOpacity={0.8}
          dot={false}
          isAnimationActive={false}
        />
        {filtered && (
          <Line
            dataKey="filtered"
            type="monotone"
            stroke="var(--color-filtered)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
        <ReferenceDot
          x={data[todayIdx]?.date}
          y={solved}
          r={4}
          fill="var(--solved)"
          stroke="var(--card)"
          strokeWidth={2}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

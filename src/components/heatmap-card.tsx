"use client";

import { useMemo } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type Solve } from "@/lib/pace";
import { byDay, countOn, heatmapWeeks } from "@/lib/stats";

const STEP = 13;
const CELL = 11;
const LEFT = 26;
const TOP = 16;

// intensity levels 0..4 (0 = nothing solved)
const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
const FILL = [
  "var(--muted)",
  "color-mix(in oklab, var(--solved) 32%, var(--card))",
  "color-mix(in oklab, var(--solved) 55%, var(--card))",
  "color-mix(in oklab, var(--solved) 78%, var(--card))",
  "var(--solved)",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function HeatmapCard({
  solves,
  startDate,
  today,
}: {
  solves: Solve[];
  startDate: string;
  today: string;
}) {
  const days = useMemo(() => byDay(solves, startDate, today), [solves, startDate, today]);
  const weeks = useMemo(() => heatmapWeeks(today), [today]);

  let total = 0;
  for (const c of days.values()) total += c.total;

  const width = LEFT + weeks.length * STEP;
  const height = TOP + 7 * STEP;

  return (
    <Card className="h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Consistency</CardTitle>
        <CardDescription>
          {total} solved since {startDate}
        </CardDescription>
        <CardAction className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          Less
          {FILL.map((f, i) => (
            <span key={i} className="size-2.5 rounded-[3px]" style={{ background: f }} />
          ))}
          More
        </CardAction>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 place-items-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="size-full max-h-full"
          role="img"
          aria-label="Solves per day over the last year"
        >
          {[1, 3, 5].map((r) => (
            <text
              key={r}
              x={0}
              y={TOP + r * STEP + 9}
              className="fill-muted-foreground text-[8px]"
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][r]}
            </text>
          ))}
          {weeks.map((week, w) => {
            const first = week[0];
            const prev = w > 0 ? weeks[w - 1][0] : null;
            const showMonth = !prev || prev.slice(5, 7) !== first.slice(5, 7);
            return (
              <g key={first} transform={`translate(${LEFT + w * STEP} 0)`}>
                {showMonth && w < weeks.length - 2 && (
                  <text x={0} y={9} className="fill-muted-foreground text-[8px]">
                    {MONTHS[Number(first.slice(5, 7)) - 1]}
                  </text>
                )}
                {week.map((d, i) => {
                  if (d > today) return null;
                  const n = countOn(days, d);
                  const tracked = d >= startDate;
                  const label = new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  });
                  return (
                    <rect
                      key={d}
                      x={0}
                      y={TOP + i * STEP}
                      width={CELL}
                      height={CELL}
                      rx={2.5}
                      fill={FILL[level(n)]}
                      opacity={tracked ? 1 : 0.35}
                      stroke={d === today ? "var(--foreground)" : "none"}
                      strokeWidth={1}
                    >
                      <title>{`${label}: ${n} solved`}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

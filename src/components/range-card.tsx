"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Difficulty } from "@/lib/data";
import { type Solve } from "@/lib/pace";
import { RANGES, byDay, rangeStats, type RangeId } from "@/lib/stats";
import { cn } from "@/lib/utils";

const config = {
  easy: { label: "Easy", color: "var(--easy)" },
  medium: { label: "Medium", color: "var(--medium)" },
  hard: { label: "Hard", color: "var(--hard)" },
} satisfies ChartConfig;

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

const n1 = (n: number) => (Math.round(n * 10) / 10).toString();

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-foreground/5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg leading-tight font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function RangeCard({
  solves,
  startDate,
  today,
  difficulty,
}: {
  solves: Solve[];
  startDate: string;
  today: string;
  difficulty: Difficulty | null;
}) {
  const [range, setRange] = useState<RangeId>("30d");
  const days = useMemo(() => byDay(solves, startDate, today), [solves, startDate, today]);
  const stats = useMemo(
    () => rangeStats(days, range, startDate, today),
    [days, range, startDate, today],
  );

  const unitLabel = { day: "per day", week: "per week", month: "per month" }[stats.unit];
  const rangeLabel = RANGES.find((r) => r.id === range)!.label;

  return (
    <Card className="@container h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Activity</CardTitle>
        <CardDescription>
          Solved {unitLabel} · {rangeLabel === "All" ? "since start" : `last ${rangeLabel}`}
        </CardDescription>
        <CardAction>
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeId)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className="px-2 text-xs">
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
          <Stat
            label="Solved"
            value={stats.total}
            sub={
              stats.delta === null ? (
                "no earlier period to compare"
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5",
                    stats.delta > 0 && "text-solved",
                    stats.delta < 0 && "text-hard",
                  )}
                >
                  {stats.delta > 0 ? (
                    <ArrowUp className="size-3" />
                  ) : stats.delta < 0 ? (
                    <ArrowDown className="size-3" />
                  ) : (
                    <Minus className="size-3" />
                  )}
                  {Math.abs(stats.delta)} vs previous
                </span>
              )
            }
          />
          <Stat label="Average" value={`${n1(stats.avg)}/day`} sub={`over ${stats.span} days`} />
          <Stat
            label="Best day"
            value={stats.best.count}
            sub={stats.best.date ? fmt(stats.best.date, { month: "short", day: "numeric" }) : "-"}
          />
          <Stat
            label="Active days"
            value={`${stats.active}/${stats.span}`}
            sub={stats.span ? `${Math.round((stats.active / stats.span) * 100)}% of days` : "-"}
          />
        </div>

        <ChartContainer config={config} className="aspect-auto min-h-36 w-full flex-1">
          <BarChart data={stats.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis
              dataKey="start"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(d: string) =>
                stats.unit === "month"
                  ? fmt(d, { month: "short" })
                  : fmt(d, { month: "short", day: "numeric" })
              }
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => {
                    const b = p?.[0]?.payload as { start: string; end: string } | undefined;
                    if (!b) return "";
                    const f = (d: string) => fmt(d, { month: "short", day: "numeric" });
                    return b.start === b.end ? f(b.start) : `${f(b.start)} to ${f(b.end)}`;
                  }}
                />
              }
            />
            <Bar dataKey="easy" stackId="a" fill="var(--color-easy)" />
            <Bar dataKey="medium" stackId="a" fill="var(--color-medium)" />
            <Bar dataKey="hard" stackId="a" fill="var(--color-hard)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
        {difficulty && (
          <p className="-mt-2 text-center text-[11px] text-muted-foreground">
            Filtered to {config[difficulty].label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStored, writeStore } from "@/lib/local-store";
import type { GoalSettings, Solve } from "@/lib/pace";
import {
  PERIOD_KINDS,
  computePeriod,
  pastPeriods,
  split,
  type PeriodKind,
} from "@/lib/periods";
import { cn } from "@/lib/utils";

/** Props every period card takes. `showSwitch` hides the card's own period switch when something else provides one. */
export type PeriodCardProps = {
  solves: Solve[];
  settings: GoalSettings;
  today: string;
  showSwitch?: boolean;
};

const KIND_KEY = "pacer.periodKind";

/** The period type you're looking at (week/month/quarter/6 mo), shared by every card, kept per device. */
export function usePeriodKind(): [PeriodKind, (k: PeriodKind) => void] {
  const stored = useStored<PeriodKind>(KIND_KEY, "week");
  const kind = PERIOD_KINDS.some((k) => k.id === stored) ? stored : "week";
  return [kind, (k) => writeStore(KIND_KEY, k)];
}

export function PeriodTabs({ className }: { className?: string }) {
  const [kind, setKind] = usePeriodKind();
  return (
    <Tabs value={kind} onValueChange={(v) => setKind(v as PeriodKind)} className={className}>
      <TabsList>
        {PERIOD_KINDS.map((k) => (
          <TabsTrigger key={k.id} value={k.id} className="px-2.5 text-xs">
            {k.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

const noun = (k: PeriodKind) => PERIOD_KINDS.find((x) => x.id === k)!.noun;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/** Which period is on screen: this one, or `offset` periods back. Resets when the period type changes. */
function useOffset(kind: PeriodKind) {
  const [st, setSt] = useState({ kind, offset: 0 });
  const offset = st.kind === kind ? st.offset : 0;
  return [offset, (o: number) => setSt({ kind, offset: o })] as const;
}

function Nav({
  label,
  offset,
  onOffset,
  current,
}: {
  label: string;
  offset: number;
  onOffset: (o: number) => void;
  current: boolean;
}) {
  const btn = "grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" aria-label="Earlier" className={btn} onClick={() => onOffset(offset - 1)}>
        <ChevronLeft className="size-3.5" />
      </button>
      <span className="tabular-nums">
        {label}
        {current && <span className="ml-1.5 rounded bg-muted px-1 py-px text-[10px]">now</span>}
      </span>
      <button
        type="button"
        aria-label="Later"
        className={btn}
        disabled={offset >= 0}
        onClick={() => onOffset(offset + 1)}
      >
        <ChevronRight className="size-3.5" />
      </button>
    </span>
  );
}

function Shell({
  title,
  description,
  showSwitch,
  children,
}: {
  title: string;
  description: ReactNode;
  showSwitch?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="@container h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {showSwitch && (
          <CardAction>
            <PeriodTabs />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {children}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-foreground/5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-lg leading-tight font-semibold tracking-tight tabular-nums",
          tone === "good" && "text-solved",
          tone === "bad" && "text-hard",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const bar = "[&_[data-slot=progress-indicator]]:bg-solved [&_[data-slot=progress-track]]:h-2";

/** The headline: what you need this period to be on pace, split into normal and catch-up. */
export function TargetCard({ solves, settings, today, showSwitch }: PeriodCardProps) {
  const [kind] = usePeriodKind();
  const [offset, setOffset] = useOffset(kind);
  const p = useMemo(
    () => computePeriod(solves, settings, today, kind, offset),
    [solves, settings, today, kind, offset],
  );
  const { normal, catchUp } = split(p);

  return (
    <Shell
      title="Target"
      showSwitch={showSwitch}
      description={<Nav label={p.label} offset={offset} onOffset={setOffset} current={p.isCurrent} />}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-end gap-2 leading-none">
          <span className="text-6xl font-bold tracking-tighter tabular-nums">{p.total}</span>
          <span className="pb-1.5 text-sm text-muted-foreground">
            to be on pace this {noun(kind)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Normal" value={normal} />
        <Stat
          label={catchUp < 0 ? "Ahead" : "Catch-up"}
          value={signed(catchUp)}
          tone={catchUp > 0 ? "bad" : catchUp < 0 ? "good" : undefined}
        />
        <Stat label="Solved" value={p.solved} tone={p.left === 0 && p.total > 0 ? "good" : undefined} />
      </div>
      <div className="mt-auto flex flex-col gap-1.5">
        <Progress value={p.total ? Math.min(100, (p.solved / p.total) * 100) : 100} className={bar} />
        <p className="text-xs text-muted-foreground tabular-nums">
          {p.left === 0
            ? p.total === 0
              ? "Nothing needed, you're ahead of pace"
              : "Covered"
            : `${p.left} left`}
        </p>
      </div>
    </Shell>
  );
}

/** What it takes per work day from here to the end of the period. */
export function PerDayCard({ solves, settings, today, showSwitch }: PeriodCardProps) {
  const [kind] = usePeriodKind();
  const p = useMemo(() => computePeriod(solves, settings, today, kind, 0), [solves, settings, today, kind]);

  let big: ReactNode;
  let sub: string;
  if (p.left === 0) {
    big = <span className="text-solved">Covered</span>;
    sub = p.total === 0 ? "You're ahead of pace for this " + noun(kind) : "Nothing more needed this " + noun(kind);
  } else if (p.perDay === null) {
    big = p.left;
    sub = `still to catch up, and no work days left this ${noun(kind)}. It rolls into the next.`;
  } else {
    big = Math.ceil(p.perDay - 1e-9);
    sub = `a work day for the rest of the ${noun(kind)}`;
  }

  return (
    <Shell title="Per work day" showSwitch={showSwitch} description={p.label}>
      <div className="flex flex-1 flex-col justify-center gap-1">
        <span className="text-5xl leading-none font-bold tracking-tighter tabular-nums">{big}</span>
        <span className="text-sm text-muted-foreground">{sub}</span>
        {p.perDay !== null && p.left > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {p.left} left over {p.workdaysLeft} work day{p.workdaysLeft === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </Shell>
  );
}

const chartConfig = {
  solved: { label: "Solved", color: "var(--solved)" },
  normal: { label: "Normal pace", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

/** Solved per day (week, month) or per week (quarter, 6 mo) against the normal pace. */
export function PeriodChartCard({ solves, settings, today, showSwitch }: PeriodCardProps) {
  const [kind] = usePeriodKind();
  const [offset, setOffset] = useOffset(kind);
  const p = useMemo(
    () => computePeriod(solves, settings, today, kind, offset),
    [solves, settings, today, kind, offset],
  );
  const data = p.buckets.map((b) => ({ ...b, normal: Math.round(b.normal * 10) / 10 }));

  return (
    <Shell
      title={kind === "week" || kind === "month" ? "Day by day" : "Week by week"}
      showSwitch={showSwitch}
      description={<Nav label={p.label} offset={offset} onOffset={setOffset} current={p.isCurrent} />}
    >
      <ChartContainer config={chartConfig} className="aspect-auto min-h-36 w-full flex-1">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={20} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
          <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ChartTooltipContent />} />
          <Bar dataKey="solved" fill="var(--color-solved)" radius={[3, 3, 0, 0]} />
          <Line
            dataKey="normal"
            type="stepAfter"
            stroke="var(--color-normal)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </Shell>
  );
}

/** How the last few periods went against their normal number. */
export function HistoryCard({ solves, settings, today, showSwitch }: PeriodCardProps) {
  const [kind] = usePeriodKind();
  const past = useMemo(
    () => pastPeriods(solves, settings, today, kind, kind === "week" ? 10 : 8),
    [solves, settings, today, kind],
  );
  const now = useMemo(() => computePeriod(solves, settings, today, kind, 0), [solves, settings, today, kind]);
  const all = [...past, now];

  return (
    <Shell title="History" showSwitch={showSwitch} description={`Solved vs. the normal number, by ${noun(kind)}`}>
      <div className="flex min-h-32 flex-1 items-stretch gap-2">
        {all.map((x) => {
          const ratio = x.normal > 0 ? x.solved / x.normal : x.solved > 0 ? 1 : 0;
          const tone = ratio >= 1 ? "bg-solved" : ratio >= 0.6 ? "bg-medium" : "bg-hard";
          return (
            <div key={x.start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div
                  title={`${x.label}: ${x.solved} of ${Math.round(x.normal)}`}
                  className={cn("w-full rounded-t", tone, x === now && "opacity-60")}
                  style={{ height: `${Math.max(4, Math.min(100, (ratio / 1.5) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums">
                {x.solved}/{Math.round(x.normal)}
              </span>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                {x === now ? "now" : x.label.split(" to ")[0]}
              </span>
            </div>
          );
        })}
      </div>
      {past.length === 0 && (
        <p className="text-xs text-muted-foreground">No finished {noun(kind)} yet. Check back after the first one.</p>
      )}
    </Shell>
  );
}

/** All four periods at once: what each needs right now. Ignores the period switch. */
export function OverviewCard({ solves, settings, today }: PeriodCardProps) {
  const rows = useMemo(
    () => PERIOD_KINDS.map((k) => ({ k, p: computePeriod(solves, settings, today, k.id, 0) })),
    [solves, settings, today],
  );
  return (
    <Shell title="All periods" description="What each one needs right now">
      <div className="flex flex-col gap-3">
        {rows.map(({ k, p }) => {
          const { normal, catchUp } = split(p);
          return (
            <div key={k.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{k.label}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{p.label}</span>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-2xl font-bold tracking-tighter">{p.total}</span>
                  <span className="ml-1.5 text-[11px] text-muted-foreground">
                    {normal} {catchUp < 0 ? "−" : "+"} {Math.abs(catchUp)}
                  </span>
                </div>
              </div>
              <Progress
                value={p.total ? Math.min(100, (p.solved / p.total) * 100) : 100}
                className={bar}
              />
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {p.solved} solved · {p.left === 0 ? "covered" : `${p.left} left`}
              </span>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

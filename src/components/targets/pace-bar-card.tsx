"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { computeBar, type PaceBar } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { PeriodTabs, usePeriodKind, type PeriodCardProps } from "./period-cards";

const n = (x: number) => Math.round(x);

/** One segment of the bar: either the catch-up stretch or one day/week/month. */
type Seg = { key: string; label: string; from: number; size: number; catchUp?: boolean };

function segments(b: PaceBar): Seg[] {
  const segs: Seg[] = [];
  if (b.catchUp > 0) segs.push({ key: "catch", label: "Catch-up", from: 0, size: b.catchUp, catchUp: true });
  b.slices.forEach((s, i) => segs.push({ key: `${i}`, label: s.label, from: s.from, size: s.size }));
  return segs;
}

/**
 * The whole pace picture as one bar. It is as long as what you need this period to be on pace,
 * cut into days (week), weeks (month) or months (quarter, 6 mo), with any catch-up first. Green
 * fills left to right as you solve; the white tick is where you should be by tonight. Fill past the
 * tick means ahead, short of it means behind.
 */
export function PaceBarCard({ solves, settings, today }: PeriodCardProps) {
  const [kind] = usePeriodKind();
  const bar = useMemo(() => computeBar(solves, settings, today, kind), [solves, settings, today, kind]);
  const segs = segments(bar);
  const delta = n(bar.delta);
  const covered = bar.length > 0 && bar.left < 0.5;

  const status =
    bar.length <= 0
      ? { text: "Nothing needed in this period", tone: "" }
      : covered
        ? { text: "Covered for the whole period", tone: "text-solved" }
        : delta >= 1
          ? { text: `${delta} ahead of pace`, tone: "text-solved" }
          : delta <= -1
            ? { text: `${-delta} behind pace`, tone: "text-hard" }
            : { text: "On pace", tone: "text-solved" };

  return (
    <Card className="@container h-full gap-0 overflow-hidden py-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3 pb-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-sm font-semibold">{bar.label}</span>
          <span className={cn("text-sm font-medium tabular-nums", status.tone)}>{status.text}</span>
          {!covered && bar.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{n(bar.left)} left</span>
          )}
        </div>
        <PeriodTabs />
      </div>

      {/* edge to edge: the bar runs the full width of the card, no side padding */}
      <div className="flex min-h-0 flex-1 gap-0.5 bg-background/40">
        {segs.map((s) => {
          const filled = Math.min(1, Math.max(0, (bar.done - s.from) / s.size));
          const tick = (bar.expected - s.from) / s.size;
          // the tick sits in the segment where "should be here by tonight" falls (its end counts)
          const hasTick = bar.length > 0 && tick > 0 && tick <= 1;
          return (
            <div key={s.key} className="flex min-w-0 flex-col" style={{ flexGrow: s.size, flexBasis: 0 }}>
              <div
                className={cn(
                  "relative min-h-0 flex-1 overflow-hidden bg-muted",
                  s.catchUp && "bg-hard/15",
                )}
              >
                <div
                  className={cn("absolute inset-y-0 left-0", s.catchUp ? "bg-solved/80" : "bg-solved")}
                  style={{ width: `${filled * 100}%` }}
                />
                {hasTick && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground shadow-[0_0_0_1px_var(--background)]"
                    style={{ left: `calc(${Math.min(1, tick) * 100}% - 1px)` }}
                    aria-label="Where you should be by tonight"
                  />
                )}
                <span className="absolute right-1.5 bottom-1 text-[10px] leading-none text-foreground/70 tabular-nums">
                  {n(s.size)}
                </span>
              </div>
              <span
                className={cn(
                  "truncate px-1 py-1 text-center text-[11px] text-muted-foreground",
                  s.catchUp && "text-hard",
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

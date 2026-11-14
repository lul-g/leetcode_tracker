"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Solve } from "@/lib/pace";
import { byDay, countOn, monthGrid, streaks } from "@/lib/stats";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const monthKey = (d: string) => d.slice(0, 7);
const shiftMonth = (anchor: string, by: number) => {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

export function StreakCalendarCard({
  solves,
  startDate,
  today,
}: {
  solves: Solve[];
  startDate: string;
  today: string;
}) {
  const [anchor, setAnchor] = useState(`${monthKey(today)}-01`);
  const days = useMemo(() => byDay(solves, startDate, today), [solves, startDate, today]);
  const s = useMemo(() => streaks(days, startDate, today), [days, startDate, today]);
  const grid = useMemo(() => monthGrid(anchor), [anchor]);

  const canPrev = monthKey(anchor) > monthKey(startDate);
  const canNext = monthKey(anchor) < monthKey(today);
  const title = new Date(`${anchor}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Card className="@container h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription>Solve at least one a day to keep your streak</CardDescription>
        <CardAction className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!canPrev}
            onClick={() => setAnchor(shiftMonth(anchor, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!canNext}
            onClick={() => setAnchor(shiftMonth(anchor, 1))}
          >
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-7 gap-y-1.5">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground">
              {d}
            </div>
          ))}
          {grid.map((d) => {
            const inMonth = monthKey(d) === monthKey(anchor);
            const n = countOn(days, d);
            const tracked = d >= startDate && d <= today;
            const solved = tracked && n > 0;
            const missed = tracked && n === 0 && d < today;
            const isToday = d === today;
            const dayNum = Number(d.slice(8));

            const cell = (
              <div
                className={cn(
                  "relative mx-auto grid size-8 place-items-center rounded-full text-xs tabular-nums @md:size-9",
                  !inMonth && "opacity-0",
                  !tracked && "text-muted-foreground/60",
                  solved && "bg-solved-bg font-semibold text-solved",
                  missed && "border border-dashed border-hard/60 text-muted-foreground",
                  isToday && "ring-2 ring-solved ring-offset-2 ring-offset-card",
                )}
              >
                {dayNum}
                {solved && (
                  <Check className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-card p-px text-solved" />
                )}
                {missed && (
                  <X className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-card p-px text-hard/80" />
                )}
              </div>
            );

            if (!inMonth || !tracked) return <div key={d}>{cell}</div>;
            return (
              <Tooltip key={d}>
                <TooltipTrigger render={<div />}>{cell}</TooltipTrigger>
                <TooltipContent>
                  {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                  {": "}
                  {n === 0 ? "nothing solved" : `${n} solved`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
            <Flame className="size-5 text-medium" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">Current streak</span>
              <span className="text-sm font-semibold tabular-nums">
                {s.current} {s.current === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
            <Trophy className="size-5 text-medium" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-muted-foreground">Best streak</span>
              <span className="text-sm font-semibold tabular-nums">
                {s.best} {s.best === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

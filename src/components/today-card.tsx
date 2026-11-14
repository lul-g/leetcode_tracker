"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computePace, type GoalSettings, type Solve } from "@/lib/pace";
import { byDay, countOn, streaks } from "@/lib/stats";

export function TodayCard({
  solves,
  settings,
  today,
}: {
  solves: Solve[];
  settings: GoalSettings;
  today: string;
}) {
  const pace = useMemo(() => computePace(solves, settings, today), [solves, settings, today]);
  const days = useMemo(
    () => byDay(solves, settings.startDate, today),
    [solves, settings.startDate, today],
  );
  const s = useMemo(() => streaks(days, settings.startDate, today), [days, settings.startDate, today]);

  const done = countOn(days, today);
  const target = Math.max(1, Math.ceil(pace.requiredPerDay));
  const left = Math.max(0, target - done);

  return (
    <Card className="@container h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Today</CardTitle>
        <CardDescription>
          {left === 0 ? "Today's pace is covered" : `${left} more to stay on pace`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="leading-none tabular-nums">
            <span className="text-4xl font-bold tracking-tighter">{done}</span>
            <span className="ml-1 text-base text-muted-foreground">/ {target}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="size-4 text-medium" />
            <span className="tabular-nums">{s.current}-day streak</span>
          </div>
        </div>
        <Progress
          value={Math.min(100, (done / target) * 100)}
          className="[&_[data-slot=progress-indicator]]:bg-solved [&_[data-slot=progress-track]]:h-2"
        />
      </CardContent>
    </Card>
  );
}

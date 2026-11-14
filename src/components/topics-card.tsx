"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TOPICS } from "@/lib/data";
import { type Solve } from "@/lib/pace";

export function TopicsCard({
  solves,
  startDate,
  today,
}: {
  solves: Solve[];
  startDate: string;
  today: string;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of solves) {
      if (!s.topic || s.date < startDate || s.date > today) continue;
      m.set(s.topic, (m.get(s.topic) ?? 0) + 1);
    }
    return m;
  }, [solves, startDate, today]);

  const started = TOPICS.filter((t) => (counts.get(t.name) ?? 0) > 0).length;

  return (
    <Card className="h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Topics</CardTitle>
        <CardDescription>
          {started} of {TOPICS.length} NeetCode 150 categories started
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-3">
          {TOPICS.map((t) => {
            const n = counts.get(t.name) ?? 0;
            return (
              <li key={t.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={n === 0 ? "text-muted-foreground" : "font-medium"}>
                    {t.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {n}/{t.total}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (n / t.total) * 100)}
                  className="[&_[data-slot=progress-indicator]]:bg-solved"
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

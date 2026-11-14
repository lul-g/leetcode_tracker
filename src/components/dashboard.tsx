"use client";

import { useState } from "react";
import { DashboardGrid } from "@/components/dashboard-grid";
import { DifficultyRing } from "@/components/difficulty-ring";
import { ListSwitcher } from "@/components/list-switcher";
import { Logo } from "@/components/logo";
import { PacePanel } from "@/components/pace-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import {
  DEMO_PROBLEMS,
  DEMO_SOLVES,
  DIFFICULTIES,
  LISTS,
  type Counts,
  type Difficulty,
} from "@/lib/data";
import { useSettings } from "@/lib/use-settings";
import { cn } from "@/lib/utils";

const TEXT: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};
const VAR: Record<Difficulty, string> = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
};

const fmt = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function Dashboard() {
  const [listId, setListId] = useState("goal");
  const [selected, setSelected] = useState<Difficulty | null>(null); // sticky filter
  const [hovered, setHovered] = useState<Difficulty | null>(null); // preview only
  const { settings, update, today } = useSettings();

  // Only solves on/after the start date count toward the goal.
  const counted = DEMO_SOLVES.filter((s) => s.date >= settings.startDate);
  const goalSolved: Counts = { easy: 0, medium: 0, hard: 0 };
  for (const s of counted) goalSolved[s.difficulty]++;

  const base = LISTS.find((l) => l.id === listId) ?? LISTS[0];
  const list = base.id === "goal" ? { ...base, solved: goalSolved } : base;
  const active = hovered ?? selected;
  const overallTotal =
    list.id === "goal"
      ? settings.goal
      : list.totals.easy + list.totals.medium + list.totals.hard;

  // The sticky filter drives the problem list; hover only previews the ring.
  const problems = DEMO_PROBLEMS.filter(
    (p) => p.lists.includes(list.id) && (!selected || p.difficulty === selected),
  );
  const selectedLabel = selected
    ? DIFFICULTIES.find((d) => d.id === selected)!.label
    : null;

  const hero = (
    <Card className="@container h-full">
      <CardContent className="flex min-h-0 flex-1 flex-col items-center gap-4">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-4 @sm:flex-row">
          <div className="grid min-h-0 w-full min-w-0 flex-1 place-items-center self-stretch [container-type:size]">
            <DifficultyRing
              solved={list.solved}
              totals={list.totals}
              overallTotal={overallTotal}
              active={active}
              listName={list.name}
            />
          </div>
          <div
            className="flex shrink-0 flex-row gap-2 @sm:flex-col"
            onMouseLeave={() => setHovered(null)}
          >
            {DIFFICULTIES.map((d) => (
              <Toggle
                key={d.id}
                pressed={selected === d.id}
                onPressedChange={(on) => setSelected(on ? d.id : null)}
                onMouseEnter={() => setHovered(d.id)}
                onFocus={() => setHovered(d.id)}
                onBlur={() => setHovered(null)}
                style={{ "--c": VAR[d.id] } as React.CSSProperties}
                className="h-auto w-24 cursor-pointer flex-col gap-0.5 bg-muted/50 px-3 py-2 ring-1 ring-foreground/5 aria-pressed:bg-muted aria-pressed:ring-2 aria-pressed:ring-(--c)"
              >
                <span className={cn("text-xs font-semibold", TEXT[d.id])}>
                  {d.short}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {list.solved[d.id]}/{list.totals[d.id]}
                </span>
              </Toggle>
            ))}
          </div>
        </div>
        <ListSwitcher value={listId} onChange={setListId} />
      </CardContent>
    </Card>
  );

  const problemsCard = (
    <Card className="h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Solved problems</CardTitle>
        <CardDescription>{list.name} · demo data</CardDescription>
        {selectedLabel && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn("h-6 px-2.5", selected && TEXT[selected])}
            >
              {selectedLabel}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Problem</TableHead>
              <TableHead className="text-right">Solved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((p) => (
              <TableRow key={p.slug}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("size-2 rounded-full bg-current", TEXT[p.difficulty])}
                    />
                    {p.title}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {fmt(p.solvedAt)}
                </TableCell>
              </TableRow>
            ))}
            {problems.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  Nothing solved here yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const pace = today ? (
    <PacePanel
      solves={DEMO_SOLVES}
      settings={settings}
      onSettings={update}
      today={today}
      difficulty={selected}
    />
  ) : (
    <Skeleton className="h-full w-full rounded-xl" />
  );

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <DashboardGrid
        toolbar={<Logo />}
        cards={{ hero, pace, problems: problemsCard }}
      />
    </main>
  );
}

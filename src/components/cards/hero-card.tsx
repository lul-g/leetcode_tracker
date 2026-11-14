"use client";

import { useState } from "react";
import { DifficultyRing } from "@/components/difficulty-ring";
import { ListSwitcher } from "@/components/list-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { useApp } from "@/lib/app-context";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
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

/** The progress ring. Hover a difficulty to preview it; click to make it the filter on every page. */
export function HeroCard() {
  const { list, lists, listId, setListId, difficulty, setDifficulty, settings } = useApp();
  const [hovered, setHovered] = useState<Difficulty | null>(null); // preview only
  const active = hovered ?? difficulty;
  const overallTotal =
    list.id === "goal"
      ? settings.goal
      : list.totals.easy + list.totals.medium + list.totals.hard;

  return (
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
                pressed={difficulty === d.id}
                onPressedChange={(on) => setDifficulty(on ? d.id : null)}
                onMouseEnter={() => setHovered(d.id)}
                onFocus={() => setHovered(d.id)}
                onBlur={() => setHovered(null)}
                style={{ "--c": VAR[d.id] } as React.CSSProperties}
                className="h-auto w-24 cursor-pointer flex-col gap-0.5 bg-muted/50 px-3 py-2 ring-1 ring-foreground/5 aria-pressed:bg-muted aria-pressed:ring-2 aria-pressed:ring-(--c)"
              >
                <span className={cn("text-xs font-semibold", TEXT[d.id])}>{d.short}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {list.solved[d.id]}/{list.totals[d.id]}
                </span>
              </Toggle>
            ))}
          </div>
        </div>
        <ListSwitcher value={listId} onChange={setListId} lists={lists} />
      </CardContent>
    </Card>
  );
}

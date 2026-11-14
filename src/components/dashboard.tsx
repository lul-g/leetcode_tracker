"use client";

import { useState } from "react";
import { DifficultyRing } from "@/components/difficulty-ring";
import { ListSwitcher } from "@/components/list-switcher";
import {
  DEFAULT_GOAL,
  DEMO_PROBLEMS,
  DIFFICULTIES,
  LISTS,
  type Difficulty,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const TEXT: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};
const BORDER: Record<Difficulty, string> = {
  easy: "border-easy",
  medium: "border-medium",
  hard: "border-hard",
};

export function Dashboard() {
  const [listId, setListId] = useState("goal");
  const [selected, setSelected] = useState<Difficulty | null>(null); // sticky filter
  const [hovered, setHovered] = useState<Difficulty | null>(null); // preview only

  const list = LISTS.find((l) => l.id === listId) ?? LISTS[0];
  const active = hovered ?? selected;
  const overallTotal =
    list.id === "goal"
      ? DEFAULT_GOAL
      : list.totals.easy + list.totals.medium + list.totals.hard;

  // The sticky filter drives the problem list; hover only previews the ring.
  const problems = DEMO_PROBLEMS.filter(
    (p) => p.lists.includes(list.id) && (!selected || p.difficulty === selected),
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 sm:p-6">
      <section className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex w-full items-center justify-between gap-4">
          <DifficultyRing
            solved={list.solved}
            totals={list.totals}
            overallTotal={overallTotal}
            active={active}
            listName={list.name}
          />
          <div
            className="flex flex-col gap-2"
            onMouseLeave={() => setHovered(null)}
          >
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={selected === d.id}
                onMouseEnter={() => setHovered(d.id)}
                onFocus={() => setHovered(d.id)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected(selected === d.id ? null : d.id)}
                className={cn(
                  "w-24 rounded-lg border border-transparent bg-secondary px-3 py-2 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected === d.id && cn("bg-accent", BORDER[d.id]),
                )}
              >
                <div className={cn("text-xs font-semibold", TEXT[d.id])}>
                  {d.short}
                </div>
                <div className="font-mono text-sm font-semibold">
                  {list.solved[d.id]}/{list.totals[d.id]}
                </div>
              </button>
            ))}
          </div>
        </div>
        <ListSwitcher value={listId} onChange={setListId} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Solved problems</h2>
          <span className="text-xs text-muted-foreground">
            {selected
              ? DIFFICULTIES.find((d) => d.id === selected)!.label
              : "All difficulties"}{" "}
            · demo data
          </span>
        </div>
        <ul className="divide-y divide-border">
          {problems.map((p) => (
            <li key={p.slug} className="flex items-center justify-between py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full bg-current", TEXT[p.difficulty])} />
                {p.title}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{p.solvedAt}</span>
            </li>
          ))}
          {problems.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Nothing solved here yet.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock, ExternalLink, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryOf, customCategories } from "@/lib/categories";
import { CategoryPicker } from "./category-picker";
import { DIFFICULTIES, LISTS, type Difficulty } from "@/lib/data";
import { addDays, daysBetween } from "@/lib/pace";
import { leetcodeUrl, type Problem } from "@/lib/problems";
import { useApp } from "@/lib/app-context";
import { useNotes } from "@/lib/use-notes";
import { cn } from "@/lib/utils";

export const DIFF_TEXT: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};
/** A selected toggle must be obvious, so it gets the solid accent instead of the faint default. */
export const SELECTED = "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90";

export const DIFF_BG: Record<Difficulty, string> = {
  easy: "bg-easy",
  medium: "bg-medium",
  hard: "bg-hard",
};

const fmt = (d: string, o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...o });

// spaced-repetition gaps (days after the first solve) used for "next review"
const GAPS = [1, 3, 7, 21, 60];

function nextReview(solvedAt: string, today: string) {
  for (const g of GAPS) {
    const due = addDays(solvedAt, g);
    if (due >= today) return due;
  }
  return null;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

/** The right-hand pane: everything about one solved problem, plus your notes. */
export function ProblemDetail({
  problem,
  today,
  onClose,
}: {
  problem: Problem;
  today: string | null;
  onClose?: () => void;
}) {
  const notes = useNotes();
  const { removeManual, problems } = useApp();
  const a = notes.get(problem.slug);
  const category = categoryOf(problem, a);
  const custom = useMemo(() => customCategories(notes.all), [notes.all]);
  const allTags = useMemo(
    () => [...new Set(problems.flatMap((p) => p.tags))].sort((x, y) => x.localeCompare(y)),
    [problems],
  );
  const diff = DIFFICULTIES.find((d) => d.id === problem.difficulty)!;
  const due = today ? nextReview(problem.solvedAt, today) : null;
  const inDays = due && today ? daysBetween(today, due) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          {problem.number > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">#{problem.number}</p>
          )}
          <h2 className="mt-0.5 text-lg leading-snug font-semibold">{problem.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("h-6 px-2.5", DIFF_TEXT[problem.difficulty])}>
              {diff.label}
            </Badge>
            <CategoryPicker
              value={category}
              isOverride={!!a.category}
              defaultLabel={problem.topic}
              custom={custom}
              tags={allTags}
              onPick={(c) => notes.set(problem.slug, { category: c ?? undefined })}
            />
            {problem.tags.map((t) => (
              <Badge key={t} variant="outline" className="h-6 px-2.5 font-normal text-muted-foreground">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={leetcodeUrl(problem.slug)} target="_blank" rel="noreferrer" />}
          >
            LeetCode
            <ExternalLink data-icon="inline-end" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {problem.manual ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Fact label="Solved on" value={fmt(problem.solvedAt)} />
              <Fact label="Logged from" value="NeetCode" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground ring-1 ring-foreground/5">
              <span>Logged by hand. If you solve it on LeetCode later, that solve replaces this.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-hard hover:text-hard"
                onClick={() => removeManual(problem.slug)}
              >
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Fact label="First solved" value={fmt(problem.solvedAt)} />
            <Fact label="Submissions" value={problem.attempts} />
            <Fact label="Language" value={problem.lang} />
            <Fact label="Runtime" value={`${problem.runtimeMs} ms`} />
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            On these lists
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {LISTS.filter((l) => problem.lists.includes(l.id) && l.id !== "goal").map((l) => (
              <Badge key={l.id} variant="outline" className="h-6 gap-1.5 px-2.5">
                <span>{l.emoji}</span>
                {l.name}
              </Badge>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Needs review</span>
              <span className="text-xs text-muted-foreground">
                Flag it to do again, e.g. you needed a hint or a solution
              </span>
            </span>
            <Switch
              checked={a.review}
              onCheckedChange={(v) => notes.set(problem.slug, { review: v })}
            />
          </label>
          {a.review && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">What did you need?</p>
              <ToggleGroup
                value={a.reason ? [a.reason] : []}
                onValueChange={(v) =>
                  notes.set(problem.slug, { reason: (v[0] as "hint" | "solution" | undefined) ?? undefined })
                }
                variant="outline"
                size="sm"
                aria-label="Why it needs review"
              >
                <ToggleGroupItem value="hint" className={cn("px-3 text-xs", SELECTED)}>
                  Used hints
                </ToggleGroupItem>
                <ToggleGroupItem value="solution" className={cn("px-3 text-xs", SELECTED)}>
                  Saw the solution
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
          {a.redone && a.redone.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Redone {a.redone.length === 1 ? "once" : `${a.redone.length} times`}:{" "}
              {a.redone.map((d) => fmt(d, { month: "short", day: "numeric" })).join(", ")}
            </p>
          )}
          {inDays !== null && due && (
            <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground ring-1 ring-foreground/5">
              <CalendarClock className="size-4 shrink-0" />
              Suggested redo {inDays === 0 ? "today" : `in ${inDays} ${inDays === 1 ? "day" : "days"}`} (
              {fmt(due, { month: "short", day: "numeric" })})
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Notes
          </h3>
          <Textarea
            value={a.note}
            onChange={(e) => notes.set(problem.slug, { note: e.target.value })}
            placeholder="Approach, gotchas, complexity…"
            className="min-h-32 resize-y"
          />
        </section>


        <Link
          href="/topics"
          className="inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          See all of {problem.topic}
        </Link>
      </div>
    </div>
  );
}

export function DetailEmpty({ label = "Select a problem" }: { label?: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Its details and your notes show up here.
        </p>
      </div>
    </div>
  );
}

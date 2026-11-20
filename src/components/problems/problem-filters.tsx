"use client";

import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryOf } from "@/lib/categories";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
import type { Problem } from "@/lib/problems";
import type { Annotation } from "@/lib/use-notes";
import { cn } from "@/lib/utils";
import { DIFF_TEXT, SELECTED } from "./problem-detail";

export type ReviewFilter = null | "any" | "hint" | "solution";
export type SortMode = "recent" | "redo";

export type Filters = {
  categories: string[];
  tags: string[];
  review: ReviewFilter;
  hasNotes: boolean;
  source: null | "leetcode" | "manual";
  sort: SortMode;
};

export const NO_FILTERS: Filters = {
  categories: [],
  tags: [],
  review: null,
  hasNotes: false,
  source: null,
  sort: "recent",
};

/** How many filters are switched on (sorting isn't a filter). */
export const activeCount = (f: Filters, difficulty: Difficulty | null) =>
  (difficulty ? 1 : 0) +
  f.categories.length +
  f.tags.length +
  (f.review ? 1 : 0) +
  (f.hasNotes ? 1 : 0) +
  (f.source ? 1 : 0);

export function matches(p: Problem, a: Annotation, f: Filters): boolean {
  if (f.categories.length && !f.categories.includes(categoryOf(p, a))) return false;
  if (f.tags.length && !f.tags.some((t) => p.tags.includes(t))) return false;
  if (f.review === "any" && !a.review) return false;
  if (f.review === "hint" && !(a.review && a.reason === "hint")) return false;
  if (f.review === "solution" && !(a.review && a.reason === "solution")) return false;
  if (f.hasNotes && !a.note.trim()) return false;
  if (f.source === "manual" && !p.manual) return false;
  if (f.source === "leetcode" && p.manual) return false;
  return true;
}

/** Where a problem sits in the "redo first" order: saw the solution, then hints, then other flags, then the rest. */
export const redoRank = (a: Annotation) =>
  !a.review ? 3 : a.reason === "solution" ? 0 : a.reason === "hint" ? 1 : 2;

export const REDO_LABELS = ["Saw the solution", "Used hints", "Flagged to redo", "Everything else"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: { name: string; count: number }[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border p-1">
      {items.map((it) => (
        <label
          key={it.name}
          className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
        >
          <Checkbox checked={selected.includes(it.name)} onCheckedChange={() => onToggle(it.name)} />
          <span className="min-w-0 flex-1 truncate">{it.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{it.count}</span>
        </label>
      ))}
      {items.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">None yet.</p>}
    </div>
  );
}

const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

/** The Filter button on the Problems page: everything you can narrow or reorder the list by. */
export function ProblemFilters({
  problems,
  notes,
  filters,
  onChange,
  difficulty,
  onDifficulty,
}: {
  /** the problems in the current list, before any filter */
  problems: Problem[];
  notes: Record<string, Annotation>;
  filters: Filters;
  onChange: (f: Filters) => void;
  difficulty: Difficulty | null;
  onDifficulty: (d: Difficulty | null) => void;
}) {
  const [tagQuery, setTagQuery] = useState("");
  const empty: Annotation = { note: "", review: false };

  const { cats, tags } = useMemo(() => {
    const c = new Map<string, number>();
    const t = new Map<string, number>();
    for (const p of problems) {
      const k = categoryOf(p, notes[p.slug] ?? empty);
      c.set(k, (c.get(k) ?? 0) + 1);
      for (const x of p.tags) t.set(x, (t.get(x) ?? 0) + 1);
    }
    const toList = (m: Map<string, number>) =>
      [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { cats: toList(c), tags: toList(t) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems, notes]);

  const n = activeCount(filters, difficulty);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const shownTags = tags.filter((t) => t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-9" />}>
        <ListFilter data-icon="inline-start" />
        Filter
        {n > 0 && (
          <span className="ml-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {n}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[75dvh] w-80 gap-4 overflow-y-auto p-3">
        <Section title="Sort">
          <ToggleGroup
            value={[filters.sort]}
            onValueChange={(v) => v[0] && set({ sort: v[0] as SortMode })}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ToggleGroupItem value="recent" className={cn("flex-1 text-xs", SELECTED)}>
              Recent
            </ToggleGroupItem>
            <ToggleGroupItem value="redo" className={cn("flex-1 text-xs", SELECTED)}>
              Redo first
            </ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section title="Difficulty">
          <ToggleGroup
            value={difficulty ? [difficulty] : []}
            onValueChange={(v) => onDifficulty((v[0] as Difficulty | undefined) ?? null)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {DIFFICULTIES.map((d) => (
              <ToggleGroupItem key={d.id} value={d.id} className={cn("flex-1 text-xs aria-pressed:bg-muted aria-pressed:ring-1 aria-pressed:ring-current", DIFF_TEXT[d.id])}>
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>

        <Section title="Needs review">
          <ToggleGroup
            value={filters.review ? [filters.review] : []}
            onValueChange={(v) => set({ review: (v[0] as ReviewFilter | undefined) ?? null })}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ToggleGroupItem value="any" className={cn("flex-1 text-xs", SELECTED)}>
              Any
            </ToggleGroupItem>
            <ToggleGroupItem value="hint" className={cn("flex-1 text-xs", SELECTED)}>
              Hints
            </ToggleGroupItem>
            <ToggleGroupItem value="solution" className={cn("flex-1 text-xs", SELECTED)}>
              Solution
            </ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section title="Category">
          <CheckList
            items={cats}
            selected={filters.categories}
            onToggle={(x) => set({ categories: toggle(filters.categories, x) })}
          />
        </Section>

        <Section title="LeetCode tag">
          <Input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="Search tags"
            className="h-8"
          />
          <CheckList items={shownTags} selected={filters.tags} onToggle={(x) => set({ tags: toggle(filters.tags, x) })} />
        </Section>

        <Section title="Other">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            Has notes
            <Switch checked={filters.hasNotes} onCheckedChange={(v) => set({ hasNotes: v })} />
          </label>
          <ToggleGroup
            value={filters.source ? [filters.source] : []}
            onValueChange={(v) => set({ source: (v[0] as Filters["source"]) ?? null })}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ToggleGroupItem value="leetcode" className={cn("flex-1 text-xs", SELECTED)}>
              From LeetCode
            </ToggleGroupItem>
            <ToggleGroupItem value="manual" className={cn("flex-1 text-xs", SELECTED)}>
              Logged by hand
            </ToggleGroupItem>
          </ToggleGroup>
        </Section>

        {n > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({ ...NO_FILTERS, sort: filters.sort });
              onDifficulty(null);
            }}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

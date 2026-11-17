"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flag, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListSwitcher } from "@/components/list-switcher";
import { PersistedPanels } from "@/components/persisted-panels";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApp } from "@/lib/app-context";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
import { addDays } from "@/lib/pace";
import type { Problem } from "@/lib/problems";
import { useNotes } from "@/lib/use-notes";
import { useDesktop } from "@/lib/use-desktop";
import { cn } from "@/lib/utils";
import { DIFF_BG, DIFF_TEXT, DetailEmpty, ProblemDetail } from "./problem-detail";

function dayLabel(d: string, today: string | null) {
  if (today && d === today) return "Today";
  if (today && d === addDays(today, -1)) return "Yesterday";
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ProblemsWorkspace() {
  const {
    problems,
    difficulty,
    setDifficulty,
    today,
    list,
    lists,
    listId,
    setListId,
    setManualOpen,
  } = useApp();
  const notes = useNotes();
  const desktop = useDesktop();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(params.get("p"));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems
      .filter((p) => p.lists.includes(listId))
      .filter((p) => !difficulty || p.difficulty === difficulty)
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.topic.toLowerCase().includes(q) ||
          String(p.number) === q,
      )
      .sort((a, b) => (a.solvedAt === b.solvedAt ? b.number - a.number : a.solvedAt < b.solvedAt ? 1 : -1));
  }, [problems, listId, difficulty, query]);

  const selected =
    visible.find((p) => p.slug === picked) ?? (desktop ? visible[0] : undefined);

  const select = useCallback((slug: string | null) => setPicked(slug), []);

  // keyboard: j/k or arrows move through the list, / focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable], [role=dialog], [role=menu]")) return;
      const i = selected ? visible.findIndex((p) => p.slug === selected.slug) : -1;
      const go = (n: Problem | undefined) => {
        if (!n) return;
        select(n.slug);
        document.getElementById(`problem-${n.slug}`)?.scrollIntoView({ block: "nearest" });
      };
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        go(visible[Math.min(visible.length - 1, i + 1)]);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        go(visible[Math.max(0, i - 1)]);
      } else if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[aria-label="Search problems"]')?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, select]);

  // group rows by solve date
  const groups = useMemo(() => {
    const out: { date: string; items: Problem[] }[] = [];
    for (const p of visible) {
      const last = out[out.length - 1];
      if (last && last.date === p.solvedAt) last.items.push(p);
      else out.push({ date: p.solvedAt, items: [p] });
    }
    return out;
  }, [visible]);

  const index = (
    <section aria-label="Problems" className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <h1 className="mr-auto text-lg font-semibold">Problems</h1>
          <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
            <Plus data-icon="inline-start" />
            Log a solve
          </Button>
          <ListSwitcher value={listId} onChange={setListId} lists={lists} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search"
              aria-label="Search problems"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <ToggleGroup
            value={difficulty ? [difficulty] : []}
            onValueChange={(v) => setDifficulty((v[0] as Difficulty | undefined) ?? null)}
            variant="outline"
            size="sm"
            aria-label="Filter by difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <ToggleGroupItem
                key={d.id}
                value={d.id}
                aria-label={d.label}
                className={cn("px-2.5 text-xs font-semibold", DIFF_TEXT[d.id])}
              >
                {d.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {groups.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium">{query || difficulty ? "No matches" : "Nothing solved yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query || difficulty
                ? "Try a different search or filter."
                : `Solved problems in ${list.name} will show up here.`}
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.date}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur md:px-5">
                <span>{dayLabel(g.date, today)}</span>
                <span className="tabular-nums">{g.items.length} solved</span>
              </div>
              <ul>
                {g.items.map((p) => {
                  const active = selected?.slug === p.slug;
                  const flagged = notes.get(p.slug).review;
                  return (
                    <li key={p.slug}>
                      <button
                        type="button"
                        id={`problem-${p.slug}`}
                        aria-current={active ? "true" : undefined}
                        onClick={() => select(p.slug)}
                        className={cn(
                          "flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-left transition-colors hover:bg-muted/50 md:px-5",
                          active && "border-primary bg-muted",
                        )}
                      >
                        <span className={cn("size-2 shrink-0 rounded-full", DIFF_BG[p.difficulty])} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {p.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {p.number > 0 ? `#${p.number} · ` : ""}
                            {p.topic}
                          </span>
                        </span>
                        {p.manual && (
                          <Badge variant="secondary" className="h-5 shrink-0 px-2 text-[11px]">
                            NeetCode
                          </Badge>
                        )}
                        {flagged && <Flag className="size-3.5 shrink-0 text-medium" />}
                        <Badge
                          variant="outline"
                          className={cn("h-5 shrink-0 px-2 text-[11px]", DIFF_TEXT[p.difficulty])}
                        >
                          {DIFFICULTIES.find((d) => d.id === p.difficulty)!.label}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const detail = selected ? (
    <ProblemDetail
      key={selected.slug}
      problem={selected}
      today={today}
      onClose={desktop ? undefined : () => select(null)}
    />
  ) : (
    <DetailEmpty />
  );

  if (desktop)
    return (
      <PersistedPanels
        id="problems-split"
        panels={[
          { id: "index", defaultSize: "60", minSize: "35", className: "flex min-w-0", children: index },
          {
            id: "detail",
            defaultSize: "40",
            minSize: "25",
            maxSize: "60",
            className: "min-w-0 bg-card",
            children: <aside aria-label="Problem detail" className="h-full">{detail}</aside>,
          },
        ]}
      />
    );

  return (
    <>
      {index}
      <Sheet open={!!selected} onOpenChange={(o) => !o && select(null)}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[85dvh] gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Problem</SheetTitle>
          </SheetHeader>
          {selected && detail}
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PersistedPanels } from "@/components/persisted-panels";
import { DIFF_BG, DIFF_TEXT, DetailEmpty } from "@/components/problems/problem-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/lib/app-context";
import { DIFFICULTIES, TOPICS } from "@/lib/data";
import { useDesktop } from "@/lib/use-desktop";
import { cn } from "@/lib/utils";

/** Index of the 18 NeetCode categories; the detail pane lists what you've solved in the chosen one. */
export function TopicsWorkspace() {
  const { problems, difficulty } = useApp();
  const desktop = useDesktop();
  const [picked, setPicked] = useState<string | null>(null);

  const byTopic = useMemo(() => {
    const m = new Map<string, typeof problems>();
    for (const p of problems) m.set(p.topic, [...(m.get(p.topic) ?? []), p]);
    return m;
  }, [problems]);

  const selected =
    TOPICS.find((t) => t.name === picked) ?? (desktop ? TOPICS[0] : undefined);
  const solvedHere = (selected ? (byTopic.get(selected.name) ?? []) : []).slice().sort((a, b) =>
    a.solvedAt < b.solvedAt ? 1 : -1,
  );
  const shown = difficulty ? solvedHere.filter((p) => p.difficulty === difficulty) : solvedHere;

  const index = (
    <section aria-label="Topics" className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center border-b px-4 md:px-5">
        <h1 className="text-lg font-semibold">Topics</h1>
        <span className="ml-3 text-sm text-muted-foreground">NeetCode 150 categories</span>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto pb-6">
        {TOPICS.map((t) => {
          const n = byTopic.get(t.name)?.length ?? 0;
          const active = selected?.name === t.name;
          return (
            <li key={t.name}>
              <button
                type="button"
                onClick={() => setPicked(t.name)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col gap-2 border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-muted/50 md:px-5",
                  active && "border-primary bg-muted",
                )}
              >
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={n === 0 ? "text-muted-foreground" : "font-medium"}>
                    {t.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {n}/{t.total}
                  </span>
                </span>
                <Progress
                  value={Math.min(100, (n / t.total) * 100)}
                  className="[&_[data-slot=progress-indicator]]:bg-solved"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const detail = selected ? (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">{selected.name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            {solvedHere.length} of {selected.total} solved
          </p>
        </div>
        {!desktop && (
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setPicked(null)}>
            <X />
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Progress
          value={Math.min(100, (solvedHere.length / selected.total) * 100)}
          className="[&_[data-slot=progress-indicator]]:bg-solved [&_[data-slot=progress-track]]:h-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <Badge key={d.id} variant="outline" className={cn("h-6 gap-1.5 px-2.5", DIFF_TEXT[d.id])}>
              {d.label}
              <span className="tabular-nums">
                {solvedHere.filter((p) => p.difficulty === d.id).length}
              </span>
            </Badge>
          ))}
        </div>
        <ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10">
          {shown.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/problems?p=${p.slug}`}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span className={cn("size-2 shrink-0 rounded-full", DIFF_BG[p.difficulty])} />
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(`${p.solvedAt}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </Link>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {solvedHere.length === 0 ? "Not started yet." : "Nothing at this difficulty."}
            </li>
          )}
        </ul>
      </div>
    </div>
  ) : (
    <DetailEmpty label="Select a topic" />
  );

  if (desktop)
    return (
      <PersistedPanels
        id="topics-split"
        panels={[
          { id: "index", defaultSize: "55", minSize: "30", className: "flex min-w-0", children: index },
          {
            id: "detail",
            defaultSize: "45",
            minSize: "28",
            maxSize: "65",
            className: "min-w-0 bg-card",
            children: <aside aria-label="Topic detail" className="h-full">{detail}</aside>,
          },
        ]}
      />
    );

  return (
    <>
      {index}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setPicked(null)}>
        <SheetContent side="bottom" showCloseButton={false} className="h-[85dvh] gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Topic</SheetTitle>
          </SheetHeader>
          {selected && detail}
        </SheetContent>
      </Sheet>
    </>
  );
}

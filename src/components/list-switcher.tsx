"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LISTS, type ProblemList } from "@/lib/data";

const total = (l: ProblemList) => l.totals.easy + l.totals.medium + l.totals.hard;
const done = (l: ProblemList) => l.solved.easy + l.solved.medium + l.solved.hard;

export function ListSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const current = LISTS.find((l) => l.id === value) ?? LISTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        <span>{current.emoji}</span>
        {current.name}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180 group-aria-expanded:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64 rounded-xl p-1.5">
        {LISTS.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => onChange(l.id)}
            className="flex-col items-stretch gap-1.5 rounded-lg px-3 py-2.5"
            data-active={l.id === value}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="w-5 text-center">{l.emoji}</span>
              {l.name}
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${(done(l) / total(l)) * 100}%`,
                  background: l.bar,
                  minWidth: done(l) > 0 ? 4 : 0,
                }}
              />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

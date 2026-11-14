"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { LISTS, type ProblemList } from "@/lib/data";

const total = (l: ProblemList) => l.totals.easy + l.totals.medium + l.totals.hard;
const done = (l: ProblemList) => l.solved.easy + l.solved.medium + l.solved.hard;

export function ListSwitcher({
  value,
  onChange,
  lists = LISTS,
}: {
  value: string;
  onChange: (id: string) => void;
  lists?: ProblemList[];
}) {
  const current = lists.find((l) => l.id === value) ?? lists[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="lg"
            className="gap-2 px-3.5 font-semibold [&[aria-expanded=true]>svg:last-child]:rotate-180"
          />
        }
      >
        <span>{current.emoji}</span>
        {current.name}
        <ChevronDown className="text-muted-foreground transition-transform" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64 p-1.5">
        {lists.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => onChange(l.id)}
            className="flex-col items-stretch gap-2 px-2.5 py-2"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="w-5 text-center">{l.emoji}</span>
              {l.name}
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                {done(l)}/{total(l)}
                {l.id === value && <Check className="size-3.5 text-solved" />}
              </span>
            </div>
            <Progress
              value={(done(l) / total(l)) * 100}
              style={{ "--bar": l.bar } as React.CSSProperties}
              className="[&_[data-slot=progress-indicator]]:min-w-1 [&_[data-slot=progress-indicator]]:bg-(--bar)"
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

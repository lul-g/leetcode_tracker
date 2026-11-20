"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NEETCODE_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const MAX = 80;

/**
 * Change a problem's main category: pick a NeetCode one, one you made earlier, or one of LeetCode's
 * tags, or type a new name and create it. "Use default" goes back to the NeetCode category.
 */
export function CategoryPicker({
  value,
  isOverride,
  defaultLabel,
  custom,
  tags,
  onPick,
}: {
  /** the category in use now */
  value: string;
  /** true when `value` was set by you rather than coming from NeetCode */
  isOverride: boolean;
  /** what "use default" goes back to */
  defaultLabel: string;
  /** categories you made up */
  custom: string[];
  /** LeetCode topic tags seen across your problems */
  tags: string[];
  /** null clears your choice */
  onPick: (category: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const query = q.trim();
  const needle = query.toLowerCase();
  const match = (s: string) => !needle || s.toLowerCase().includes(needle);

  const groups = useMemo(
    () =>
      [
        { title: "Your categories", items: custom.filter(match) },
        { title: "NeetCode", items: NEETCODE_CATEGORIES.filter(match) },
        { title: "LeetCode tags", items: tags.filter(match) },
      ].filter((g) => g.items.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [custom, tags, needle],
  );
  const known = [...custom, ...NEETCODE_CATEGORIES, ...tags].some((s) => s.toLowerCase() === needle);
  const canCreate = query.length > 0 && query.length <= MAX && !known;

  const choose = (c: string | null) => {
    onPick(c);
    setOpen(false);
    setQ("");
  };

  const row = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted";

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary px-2.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
            aria-label="Change category"
          />
        }
      >
        {value}
        <ChevronDown className="size-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-2 p-2">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) choose(query);
          }}
          placeholder="Search, or type a new category"
          maxLength={MAX}
          className="h-8"
        />
        <div className="max-h-64 overflow-y-auto">
          {isOverride && !needle && (
            <button type="button" className={cn(row, "text-muted-foreground")} onClick={() => choose(null)}>
              <RotateCcw className="size-3.5" />
              Use default ({defaultLabel})
            </button>
          )}
          {canCreate && (
            <button type="button" className={row} onClick={() => choose(query)}>
              <Plus className="size-3.5" />
              Create &ldquo;{query}&rdquo;
            </button>
          )}
          {groups.map((g) => (
            <div key={g.title} className="mt-1">
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {g.title}
              </p>
              {g.items.map((c) => (
                <button key={`${g.title}-${c}`} type="button" className={row} onClick={() => choose(c)}>
                  <Check className={cn("size-3.5", c === value ? "opacity-100" : "opacity-0")} />
                  {c}
                </button>
              ))}
            </div>
          ))}
          {!groups.length && !canCreate && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nothing matches.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

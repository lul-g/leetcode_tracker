"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Lock, Search } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useApp } from "@/lib/app-context";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
import { BLIND75_SLUGS, NC150_SLUGS, topicOf } from "@/lib/lists-data";
import { cn } from "@/lib/utils";
import { DIFF_BG, DIFF_TEXT } from "./problem-detail";

const LEVEL: Record<number, Difficulty> = { 1: "easy", 2: "medium", 3: "hard" };

const titleFromSlug = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Option = {
  slug: string;
  title: string;
  number: number;
  difficulty: Difficulty | null;
  premium: boolean;
  topic: string;
};

/** Log a problem you solved somewhere else, e.g. on NeetCode when LeetCode locks it behind premium. */
export function ManualSolveDialog() {
  const { manualOpen, setManualOpen } = useApp();
  return (
    <Dialog open={manualOpen} onOpenChange={setManualOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {/* remount on open so the form always starts empty */}
        {manualOpen && <ManualForm onDone={() => setManualOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const { problems, manual, catalogEntries, addManual, today, settings } = useApp();

  const [custom, setCustom] = useState(false);
  const [picked, setPicked] = useState<Option | null>(null);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [date, setDate] = useState(today ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  const taken = useMemo(
    () => new Set([...problems.map((p) => p.slug), ...manual.map((m) => m.slug)]),
    [problems, manual],
  );

  const options = useMemo<Option[]>(() => {
    const slugs = Array.from(new Set([...NC150_SLUGS, ...BLIND75_SLUGS]));
    return slugs
      .filter((s) => !taken.has(s))
      .map((slug) => {
        const e = catalogEntries[slug];
        return {
          slug,
          title: e?.title ?? titleFromSlug(slug),
          number: e?.n ?? 0,
          difficulty: e ? LEVEL[e.d] : null,
          premium: !!e?.p,
          topic: topicOf(slug),
        };
      })
      .sort((a, b) => Number(b.premium) - Number(a.premium) || a.number - b.number);
  }, [taken, catalogEntries]);

  const anyPremiumKnown = options.some((o) => o.premium);
  const [premiumOnly, setPremiumOnly] = useState(anyPremiumKnown);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !premiumOnly || o.premium)
      .filter(
        (o) =>
          !q ||
          o.title.toLowerCase().includes(q) ||
          o.topic.toLowerCase().includes(q) ||
          String(o.number) === q,
      );
  }, [options, premiumOnly, query]);

  const choose = (o: Option) => {
    setPicked(o);
    setDifficulty(o.difficulty);
    setPickerOpen(false);
  };

  const finalTitle = custom ? title.trim() : (picked?.title ?? "");
  const finalSlug = custom ? slugify(title) : (picked?.slug ?? "");
  const exists = custom && taken.has(finalSlug);
  const valid = !!finalSlug && !!finalTitle && !!difficulty && !!date && !exists;
  const beforeStart = !!date && date < settings.startDate;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !difficulty) return;
    addManual({
      slug: finalSlug,
      title: finalTitle,
      number: custom ? Number(number) || 0 : (picked?.number ?? 0),
      difficulty,
      solvedAt: date,
    });
    onDone();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Log a solve</DialogTitle>
        <DialogDescription>
          For problems you solved on NeetCode that LeetCode won&apos;t let you open, like premium
          ones. They count toward your goal, streak and lists like any other solve.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        {!custom ? (
          <Field>
            <FieldLabel>Problem</FieldLabel>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  />
                }
              >
                <span className={cn("truncate", !picked && "text-muted-foreground")}>
                  {picked ? picked.title : "Choose a problem…"}
                </span>
                <ChevronsUpDown className="text-muted-foreground" data-icon="inline-end" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[22rem] gap-2 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the NeetCode 150 and Blind 75"
                    className="h-9 pl-9"
                  />
                </div>
                {anyPremiumKnown && (
                  <label className="flex cursor-pointer items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                    Premium problems only
                    <Switch checked={premiumOnly} onCheckedChange={setPremiumOnly} />
                  </label>
                )}
                <ul className="max-h-64 overflow-y-auto">
                  {shown.map((o) => (
                    <li key={o.slug}>
                      <button
                        type="button"
                        onClick={() => choose(o)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            o.difficulty ? DIFF_BG[o.difficulty] : "bg-muted-foreground/40",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{o.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {o.number ? `#${o.number} · ` : ""}
                            {o.topic}
                          </span>
                        </span>
                        {o.premium && (
                          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px]">
                            <Lock /> Premium
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                  {shown.length === 0 && (
                    <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {premiumOnly
                        ? "No premium problems left to log."
                        : "Nothing matches, or you've already got them all."}
                    </li>
                  )}
                </ul>
              </PopoverContent>
            </Popover>
            <FieldDescription>
              {anyPremiumKnown
                ? "Premium ones are listed first."
                : "Sync once and the premium ones get a lock badge."}{" "}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Not in the list?
              </button>
            </FieldDescription>
          </Field>
        ) : (
          <>
            <Field data-invalid={exists}>
              <FieldLabel htmlFor="manual-title">Problem title</FieldLabel>
              <Input
                id="manual-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Encode and Decode Strings"
                aria-invalid={exists}
              />
              <FieldDescription>
                {exists ? (
                  "You've already got that one."
                ) : (
                  <>
                    Exactly as on LeetCode, so the link works.{" "}
                    <button
                      type="button"
                      onClick={() => setCustom(false)}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Pick from the list instead
                    </button>
                  </>
                )}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="manual-number">LeetCode number (optional)</FieldLabel>
              <Input
                id="manual-number"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="271"
              />
            </Field>
          </>
        )}

        <Field>
          <FieldLabel>Difficulty</FieldLabel>
          <ToggleGroup
            value={difficulty ? [difficulty] : []}
            onValueChange={(v) => setDifficulty((v[0] as Difficulty | undefined) ?? difficulty)}
            variant="outline"
            aria-label="Difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <ToggleGroupItem
                key={d.id}
                value={d.id}
                className={cn("flex-1 font-semibold", DIFF_TEXT[d.id])}
              >
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="manual-date">Solved on</FieldLabel>
          <DatePicker id="manual-date" value={date} onChange={setDate} />
          {beforeStart && (
            <FieldDescription className="text-medium">
              That&apos;s before your start date ({settings.startDate}), so it won&apos;t count
              toward your goal.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={!valid}>
          Add solve
        </Button>
      </DialogFooter>
    </form>
  );
}

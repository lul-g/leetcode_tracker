"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { autoWeeklyGoal, weeklyGoalOf } from "@/lib/periods";

/**
 * The one number everything on the Targets page comes from. Leave it on the app's proposal (your goal
 * spread over the work days) or set your own; it's saved with your other settings, so it syncs.
 */
export function WeeklyGoal() {
  const { settings, updateSettings } = useApp();
  const auto = autoWeeklyGoal(settings);
  const current = weeklyGoalOf(settings);
  const custom = !!settings.weeklyGoal && settings.weeklyGoal !== auto;

  // typed text lives here; an edit is committed on Enter/blur and the field then follows the saved value
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(current);

  const commit = () => {
    const n = Math.floor(Number(draft));
    setDraft(null);
    if (!Number.isFinite(n) || n < 1 || n > 500 || n === current) return;
    updateSettings({ weeklyGoal: n === auto ? null : n });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3">
      <label htmlFor="weekly-goal" className="text-sm font-medium">
        Weekly goal
      </label>
      <Input
        id="weekly-goal"
        type="number"
        inputMode="numeric"
        min={1}
        max={500}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-sm text-muted-foreground">
        problems a week, Monday to Friday
        {custom ? ` (the app would suggest ${auto})` : " (the app's suggestion from your goal)"}
      </span>
      {custom && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(null);
            updateSettings({ weeklyGoal: null });
          }}
        >
          Use {auto}
        </Button>
      )}
      <p className="basis-full text-xs text-muted-foreground">
        Month, quarter and 6-month numbers come from this. Weekends are rest days. Whatever you are
        behind or ahead of pace rolls into the next period: behind adds to it, ahead lowers it.
      </p>
    </div>
  );
}

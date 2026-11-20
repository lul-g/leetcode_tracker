"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { LeetCodeConnection } from "@/components/leetcode-connection";
import { SyncConnection } from "@/components/sync-connection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsTab } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { GoalSettings } from "@/lib/pace";
import { autoWeeklyGoal } from "@/lib/periods";

export function SettingsDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  settings,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  settings: GoalSettings;
  onSave: (s: GoalSettings) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Your goal, your LeetCode connection and device sync.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as SettingsTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="goal">Goal</TabsTrigger>
            <TabsTrigger value="leetcode">LeetCode</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>
        </Tabs>
        {tab === "goal" ? (
          // remount on open so the form always starts from the saved values
          open && (
            <GoalForm
              settings={settings}
              onSave={(s) => {
                onSave(s);
                onOpenChange(false);
              }}
            />
          )
        ) : tab === "leetcode" ? (
          <LeetCodeConnection />
        ) : (
          <SyncConnection />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  settings,
  onSave,
}: {
  settings: GoalSettings;
  onSave: (s: GoalSettings) => void;
}) {
  const [goal, setGoal] = useState(String(settings.goal));
  const [start, setStart] = useState(settings.startDate);
  const [target, setTarget] = useState(settings.targetDate);

  const [weekly, setWeekly] = useState(settings.weeklyGoal ? String(settings.weeklyGoal) : "");

  const goalN = Number(goal);
  const goalOk = Number.isInteger(goalN) && goalN > 0;
  const datesOk = Boolean(start && target && target > start);
  const weeklyN = Number(weekly);
  // blank means "work it out from the goal"
  const weeklyOk = weekly.trim() === "" || (Number.isInteger(weeklyN) && weeklyN >= 1 && weeklyN <= 500);
  const valid = goalOk && datesOk && weeklyOk;
  const suggested = goalOk && datesOk ? autoWeeklyGoal({ goal: goalN, startDate: start, targetDate: target }) : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onSave({
            goal: goalN,
            startDate: start,
            targetDate: target,
            weeklyGoal: weekly.trim() === "" ? null : weeklyN,
          });
      }}
    >
      <FieldGroup>
        <Field data-invalid={!goalOk}>
          <FieldLabel htmlFor="goal">Problems to solve</FieldLabel>
          <Input
            id="goal"
            type="number"
            inputMode="numeric"
            min={1}
            value={goal}
            aria-invalid={!goalOk}
            onChange={(e) => setGoal(e.target.value)}
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="start">Start date</FieldLabel>
            <DatePicker id="start" value={start} onChange={setStart} />
          </Field>
          <Field data-invalid={!datesOk}>
            <FieldLabel htmlFor="target">Target date</FieldLabel>
            <DatePicker id="target" value={target} onChange={setTarget} min={start} />
          </Field>
        </div>
        <Field data-invalid={!weeklyOk}>
          <FieldLabel htmlFor="weekly">Weekly goal</FieldLabel>
          <Input
            id="weekly"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={weekly}
            placeholder={suggested ? String(suggested) : "Auto"}
            aria-invalid={!weeklyOk}
            onChange={(e) => setWeekly(e.target.value)}
            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <FieldDescription>
            {suggested
              ? `Problems per week, Monday to Friday. Leave blank to use ${suggested} (your goal spread over the work days). Drives the week, month, quarter and 6-month bars.`
              : "Problems per week, Monday to Friday."}
          </FieldDescription>
        </Field>
        <FieldDescription>
          {datesOk
            ? "Only solves on or after the start date count."
            : "Target date must be after the start date."}
        </FieldDescription>
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={!valid}>
          Save goal
        </Button>
      </DialogFooter>
    </form>
  );
}

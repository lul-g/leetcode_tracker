"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { GoalSettings } from "@/lib/pace";

export function GoalDialog({
  settings,
  onSave,
}: {
  settings: GoalSettings;
  onSave: (s: GoalSettings) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Edit goal" />
        }
      >
        <Settings2 />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {/* remount on open so the form always starts from the saved values */}
        {open && (
          <GoalForm
            settings={settings}
            onSave={(s) => {
              onSave(s);
              setOpen(false);
            }}
          />
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

  const goalN = Number(goal);
  const goalOk = Number.isInteger(goalN) && goalN > 0;
  const datesOk = Boolean(start && target && target > start);
  const valid = goalOk && datesOk;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ goal: goalN, startDate: start, targetDate: target });
      }}
    >
      <DialogHeader>
        <DialogTitle>Your goal</DialogTitle>
        <DialogDescription>
          Change these any time; every stat recomputes instantly.
        </DialogDescription>
      </DialogHeader>

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
            className="font-mono"
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

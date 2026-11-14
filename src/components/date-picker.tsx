"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const toISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

type Props = {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  /** earliest selectable day (YYYY-MM-DD) */
  min?: string;
  className?: string;
};

export function DatePicker({ id, value, onChange, min, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? toDate(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start font-normal data-[popup-open]:bg-muted",
              !selected && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selected
          ? selected.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2024, 0)}
          endMonth={new Date(2032, 11)}
          defaultMonth={selected}
          selected={selected}
          disabled={min ? { before: toDate(min) } : undefined}
          onSelect={(d) => {
            if (!d) return;
            onChange(toISO(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

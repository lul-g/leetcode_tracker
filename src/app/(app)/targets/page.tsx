"use client";

import type { ReactNode } from "react";
import { Check, LayoutDashboard, Plus } from "lucide-react";
import { PageShell, PageTitle } from "@/components/app-shell/page-shell";
import { useCards } from "@/components/cards/registry";
import { PeriodTabs } from "@/components/targets/period-cards";
import { WeeklyGoal } from "@/components/targets/weekly-goal";
import { Button } from "@/components/ui/button";
import { useDashboardCard } from "@/lib/dashboard-layout";

/** A card with a button to put it on (or take it off) the dashboard. */
function Pinnable({ id, ids, children }: { id: string; ids: string[]; children: ReactNode }) {
  const { on, toggle } = useDashboardCard(id, ids);
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1">{children}</div>
      <Button
        variant={on ? "secondary" : "outline"}
        size="sm"
        onClick={toggle}
        className="self-start"
        aria-pressed={on}
      >
        {on ? <Check data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
        {on ? "On dashboard" : "Add to dashboard"}
        <LayoutDashboard data-icon="inline-end" className="opacity-60" />
      </Button>
    </div>
  );
}

/** "What do I need this week / month / quarter / half?": one weekly goal, rolled up with rollover. */
export default function TargetsPage() {
  const c = useCards({ periodSwitch: false });
  const ids = Object.keys(c);
  const cell = (id: string, className: string) => (
    <div className={className}>
      <Pinnable id={id} ids={ids}>
        {c[id].node}
      </Pinnable>
    </div>
  );
  return (
    <PageShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageTitle title="Targets" subtitle="What you need this week, month, quarter and half-year" />
          <PeriodTabs />
        </div>
        <WeeklyGoal />
        <div className="grid gap-4 lg:grid-cols-12">
          {cell("p-bar", "h-48 lg:col-span-12")}
          {cell("p-target", "h-[26rem] lg:col-span-5")}
          {cell("p-chart", "h-[26rem] lg:col-span-7")}
          {cell("p-perday", "h-64 lg:col-span-4")}
          {cell("p-history", "h-64 lg:col-span-8")}
          {cell("p-overview", "h-[32rem] lg:col-span-12")}
        </div>
      </div>
    </PageShell>
  );
}

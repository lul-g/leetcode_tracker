"use client";

import { PageShell, PageTitle } from "@/components/app-shell/page-shell";
import { useCards } from "@/components/cards/registry";

/** "How am I doing?": pace, today, calendar, activity and consistency in one place. */
export default function ProgressPage() {
  const c = useCards();
  return (
    <PageShell>
      <div className="flex flex-col gap-4">
        <PageTitle title="Progress" subtitle="Are you on track, and how steady you've been" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="h-[40rem] lg:col-span-8">{c.pace.node}</div>
          <div className="flex flex-col gap-4 lg:col-span-4">
            <div className="h-44">{c.today.node}</div>
            <div className="h-[28rem]">{c.calendar.node}</div>
          </div>
          <div className="h-[26rem] lg:col-span-12">{c.range.node}</div>
          <div className="h-64 lg:col-span-12">{c.heatmap.node}</div>
        </div>
      </div>
    </PageShell>
  );
}

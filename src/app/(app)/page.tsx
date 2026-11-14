"use client";

import { PageShell, PageTitle } from "@/components/app-shell/page-shell";
import { useCards } from "@/components/cards/registry";
import { DashboardGrid } from "@/components/dashboard-grid";

export default function DashboardPage() {
  const cards = useCards();
  return (
    <PageShell>
      <DashboardGrid
        cards={cards}
        title={<PageTitle title="Dashboard" subtitle="Drag, resize and choose your own cards" />}
      />
    </PageShell>
  );
}

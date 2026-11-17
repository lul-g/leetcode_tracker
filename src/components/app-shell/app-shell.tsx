"use client";

import type { ReactNode } from "react";
import { SettingsDialog } from "@/components/goal-dialog";
import { ManualSolveDialog } from "@/components/problems/manual-solve-dialog";
import { useApp } from "@/lib/app-context";
import { StatusBanner } from "./status-banner";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

/** Sidebar + page on desktop, page + bottom tabs on phones. Settings open as a dialog over any page. */
export function AppShell({ children }: { children: ReactNode }) {
  const {
    settings,
    updateSettings,
    settingsOpen,
    setSettingsOpen,
    settingsTab,
    openSettings,
    hydrated,
  } = useApp();
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        {/* Your data, settings and card layout live in this browser, so the server can only guess
            at them. Show nothing until they're read, then fade the real page in, rather than
            flashing demo numbers and default card sizes first. */}
        {hydrated && (
          <div className="flex min-h-0 flex-1 animate-in flex-col duration-200 fade-in">
            <StatusBanner />
            {children}
          </div>
        )}
      </main>
      <BottomNav />
      <ManualSolveDialog />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tab={settingsTab}
        onTabChange={openSettings}
        settings={settings}
        onSave={updateSettings}
      />
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { SettingsDialog } from "@/components/goal-dialog";
import { useApp } from "@/lib/app-context";
import { StatusBanner } from "./status-banner";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";

/** Sidebar + page on desktop, page + bottom tabs on phones. Settings open as a dialog over any page. */
export function AppShell({ children }: { children: ReactNode }) {
  const { settings, updateSettings, settingsOpen, setSettingsOpen, settingsTab, openSettings } =
    useApp();
  return (
    <div className="flex h-dvh">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <StatusBanner />
        {children}
      </main>
      <BottomNav />
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

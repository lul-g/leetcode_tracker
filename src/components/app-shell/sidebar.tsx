"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PanelLeft, RefreshCw, Settings } from "lucide-react";
import { LogoMark, APP_NAME } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/app-context";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { NAV, useActive } from "./nav";
import { SidebarConnect } from "./sidebar-connect";

/* collapsed state persists per device (a convenience, not data) */
const KEY = "lc-tracker-sidebar-collapsed";
const listeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
function setCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}
function useCollapsed() {
  return useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    readCollapsed,
    () => false,
  );
}

const itemClass =
  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-[0.95rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/**
 * Copilot-style sidebar: logo and collapse on top, the pages, your lists (click one to
 * filter Problems), Settings at the foot. Desktop only; phones get a bottom tab bar.
 */
export function Sidebar() {
  const collapsed = useCollapsed();
  const isActive = useActive();
  const router = useRouter();
  const {
    lists,
    listId,
    setListId,
    openSettings,
    settings,
    isDemo,
    connection,
    syncStatus,
    sync,
  } = useApp();
  const syncing = syncStatus.running;
  const syncLabel = syncing
    ? syncStatus.total
      ? `Syncing ${syncStatus.done}/${syncStatus.total}`
      : "Syncing…"
    : !connection.connected
      ? isDemo
        ? "Demo data · connect"
        : "Not connected"
      : connection.lastSyncedAt
        ? `Synced ${timeAgo(connection.lastSyncedAt)}`
        : "Not synced yet";
  const onSync = () => (connection.connected ? sync("incremental") : openSettings("leetcode"));

  const withTip = (label: string, node: React.ReactElement) =>
    collapsed ? (
      <Tooltip key={label}>
        <TooltipTrigger render={node} />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      <div key={label}>{node}</div>
    );

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 pl-1 font-semibold tracking-tight">
            <LogoMark className="size-7" />
            {APP_NAME}
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          <PanelLeft />
        </Button>
      </div>

      <nav aria-label="Pages" className="flex flex-col gap-0.5 border-b p-3">
        {NAV.map((n) => {
          const active = isActive(n.href);
          return withTip(
            n.label,
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? n.label : undefined}
              className={cn(
                itemClass,
                active &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <n.icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {!collapsed && <span className="truncate">{n.label}</span>}
            </Link>,
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!collapsed && (
          <>
            <p className="px-2.5 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Lists
            </p>
            <ul className="flex flex-col gap-0.5">
              {lists.map((l) => {
                const total =
                  l.id === "goal" ? settings.goal : l.totals.easy + l.totals.medium + l.totals.hard;
                const done = l.solved.easy + l.solved.medium + l.solved.hard;
                const active = l.id === listId;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setListId(l.id);
                        router.push("/problems");
                      }}
                      className={cn(
                        "flex w-full flex-col gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                        active && "bg-muted",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="w-5 text-center">{l.emoji}</span>
                        <span className="truncate">{l.name}</span>
                        <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                          {done}/{total}
                        </span>
                      </span>
                      <Progress
                        value={Math.min(100, (done / total) * 100)}
                        style={{ "--bar": l.bar } as React.CSSProperties}
                        className="[&_[data-slot=progress-indicator]]:bg-(--bar)"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-0.5 border-t p-3">
        {!collapsed && <SidebarConnect />}
        {withTip(
          syncLabel,
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            aria-label={collapsed ? syncLabel : "Sync with LeetCode"}
            title="Sync with LeetCode now"
            className={cn(itemClass, "w-full", collapsed && "justify-center px-0")}
          >
            <RefreshCw
              className={cn("size-5 shrink-0", syncing && "animate-spin")}
              strokeWidth={1.8}
            />
            {!collapsed && <span className="truncate text-sm">{syncLabel}</span>}
          </button>,
        )}
        {withTip(
          "Settings",
          <button
            type="button"
            onClick={() => openSettings()}
            aria-label={collapsed ? "Settings" : undefined}
            className={cn(itemClass, "w-full", collapsed && "justify-center px-0")}
          >
            <Settings className="size-5 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="truncate">Settings</span>}
          </button>,
        )}
      </div>
    </aside>
  );
}

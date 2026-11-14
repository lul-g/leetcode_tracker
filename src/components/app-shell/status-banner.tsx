"use client";

import { Info, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

/** A slim strip above the page: demo data, a running sync, or an expired cookie. */
export function StatusBanner() {
  const {
    isDemo,
    dataLoaded,
    connection,
    syncStatus,
    syncSummary,
    problems,
    settings,
    openSettings,
    sync,
  } = useApp();

  if (syncStatus.running) {
    return (
      <Strip tone="info" icon={<Loader2 className="size-4 animate-spin" />}>
        <span className="min-w-0 flex-1 truncate">
          {syncStatus.phase}
          {syncStatus.total > 0 && ` (${syncStatus.done}/${syncStatus.total})`}
        </span>
        {syncStatus.total > 0 && (
          <Progress
            value={(syncStatus.done / syncStatus.total) * 100}
            className="w-32 [&_[data-slot=progress-indicator]]:bg-primary"
          />
        )}
      </Strip>
    );
  }

  // errors from a past sync only matter while a cookie is saved
  if (connection.connected && syncStatus.authError) {
    return (
      <Strip tone="warn" icon={<TriangleAlert className="size-4" />}>
        <span className="min-w-0 flex-1">
          LeetCode rejected your cookie, so it has probably expired.
        </span>
        <Button size="sm" onClick={() => openSettings("leetcode")}>
          Paste a new one
        </Button>
      </Strip>
    );
  }

  if (connection.connected && syncStatus.error) {
    return (
      <Strip tone="warn" icon={<TriangleAlert className="size-4" />}>
        <span className="min-w-0 flex-1 truncate">Sync failed: {syncStatus.error}</span>
        <Button size="sm" variant="outline" onClick={() => sync("incremental")}>
          Retry
        </Button>
      </Strip>
    );
  }

  // synced fine, but nothing counts: explain why instead of showing a bare zero
  if (dataLoaded && !isDemo && syncSummary && problems.length === 0) {
    const start = new Date(`${settings.startDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (syncSummary.solvedOnLeetCode === 0) {
      return (
        <Strip tone="warn" icon={<TriangleAlert className="size-4" />}>
          <span className="min-w-0 flex-1">
            LeetCode reported 0 solved problems for this session. Check that the cookie is from
            the right account.
          </span>
          <Button size="sm" variant="outline" onClick={() => openSettings("leetcode")}>
            Open settings
          </Button>
        </Strip>
      );
    }
    if (syncSummary.withAccepted === 0) {
      return (
        <Strip tone="warn" icon={<TriangleAlert className="size-4" />}>
          <span className="min-w-0 flex-1">
            LeetCode lists {syncSummary.solvedOnLeetCode} solved, but no accepted submissions
            came through.
          </span>
          <Button size="sm" variant="outline" onClick={() => sync("full")}>
            Full resync
          </Button>
        </Strip>
      );
    }
    return (
      <Strip tone="info" icon={<Info className="size-4" />}>
        <span className="min-w-0 flex-1">
          LeetCode shows {syncSummary.solvedOnLeetCode} solved, but none were accepted on or
          after your start date ({start}). Only solves since then count toward your goal.
        </span>
        <Button size="sm" variant="outline" onClick={() => openSettings("goal")}>
          Change start date
        </Button>
      </Strip>
    );
  }

  if (dataLoaded && isDemo) {
    return (
      <Strip tone="info" icon={<Info className="size-4" />}>
        <span className="min-w-0 flex-1">
          {connection.connected
            ? "Connected, but nothing has synced yet."
            : "You're looking at demo data."}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            connection.connected ? sync("incremental") : openSettings("leetcode")
          }
        >
          {connection.connected ? "Sync now" : "Connect LeetCode"}
        </Button>
      </Strip>
    );
  }

  return null;
}

function Strip({
  tone,
  icon,
  children,
}: {
  tone: "info" | "warn";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 items-center gap-3 border-b px-4 py-2 text-sm md:px-6",
        tone === "info" ? "bg-primary/10 text-foreground" : "bg-medium/10 text-foreground",
      )}
    >
      <span className={tone === "info" ? "text-primary" : "text-medium"}>{icon}</span>
      {children}
    </div>
  );
}

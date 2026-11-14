"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataPayload, SyncStatus } from "@/lib/sync-types";

const EMPTY_STATUS: SyncStatus = {
  running: false,
  mode: null,
  phase: "",
  done: 0,
  total: 0,
  error: null,
  authError: false,
  finishedAt: null,
  lastSyncedAt: null,
};

/**
 * The synced LeetCode data, the sync status, and the actions on them. Talks to the local
 * /api routes; while a sync runs it polls for progress and reloads the data when it ends.
 */
export function useSyncedData() {
  const [data, setData] = useState<DataPayload | null>(null);
  const [status, setStatus] = useState<SyncStatus>(EMPTY_STATUS);
  const [loaded, setLoaded] = useState(false);
  const wasRunning = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as DataPayload);
    } catch {}
    setLoaded(true);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (res.ok) setStatus((await res.json()) as SyncStatus);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    void loadStatus();
  }, [loadData, loadStatus]);

  // poll while a sync is running, and reload the data once it finishes
  useEffect(() => {
    if (status.running) {
      wasRunning.current = true;
      const id = setInterval(loadStatus, 1000);
      return () => clearInterval(id);
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      void loadData();
    }
  }, [status.running, loadStatus, loadData]);

  const sync = useCallback(
    async (mode: "incremental" | "full" = "incremental") => {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode }),
        });
        if (res.ok) setStatus((await res.json()) as SyncStatus);
      } catch {}
    },
    [],
  );

  /** Save a cookie. Resolves to an error message, or null on success. */
  const connect = useCallback(
    async (session: string, csrf: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/connection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session, csrf }),
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!body.ok) return body.error ?? "Could not connect.";
        await loadData();
        void sync("incremental"); // pull the history straight away
        return null;
      } catch {
        return "Could not reach the local server.";
      }
    },
    [loadData, sync],
  );

  const disconnect = useCallback(async () => {
    await fetch("/api/connection", { method: "DELETE" }).catch(() => {});
    await loadData();
  }, [loadData]);

  return { data, status, loaded, sync, connect, disconnect, reload: loadData };
}

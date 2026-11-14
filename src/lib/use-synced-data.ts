"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { whoami, ClientAuthError } from "@/lib/lc-client";
import {
  KEYS,
  useStoreReady,
  useStored,
  writeStore,
  type StoredCatalog,
  type StoredMeta,
} from "@/lib/local-store";
import { buildRecords } from "@/lib/records";
import { runSync } from "@/lib/sync-client";
import type {
  Credentials,
  ListTotals,
  ProblemRecord,
  Sub,
  SyncMode,
  SyncStatus,
} from "@/lib/sync-types";

const IDLE: SyncStatus = {
  running: false,
  mode: null,
  phase: "",
  done: 0,
  total: 0,
  error: null,
  authError: false,
};

/**
 * Pull the session out of whatever was pasted: the bare LEETCODE_SESSION value, a
 * `LEETCODE_SESSION=...` pair, or a whole Cookie header (a csrftoken in it is kept too).
 */
export function parseCookies(input: string) {
  const clean = (s: string) => s.trim().replace(/^["']|["']$/g, "");
  const pick = (name: string) => {
    const m = new RegExp(`${name}=([^;\\s]+)`).exec(input);
    return m ? clean(m[1]) : "";
  };
  const session = pick("LEETCODE_SESSION") || (input.includes("=") ? "" : clean(input));
  return { session, csrf: pick("csrftoken") };
}

const NO_SUBS: Record<string, Sub[]> = {};

/**
 * The synced LeetCode data (kept in this browser), the sync status, and the actions on them.
 * Syncing runs in the page; see lib/sync-client.ts.
 */
export function useSyncedData() {
  const ready = useStoreReady();
  const creds = useStored<Credentials | null>(KEYS.credentials, null);
  const subs = useStored<Record<string, Sub[]>>(KEYS.submissions, NO_SUBS);
  const catalog = useStored<StoredCatalog | null>(KEYS.catalog, null);
  const meta = useStored<StoredMeta>(KEYS.meta, { lastSyncedAt: null });
  const [status, setStatus] = useState<SyncStatus>(IDLE);
  const running = useRef(false);

  const records = useMemo<ProblemRecord[]>(
    () => buildRecords(subs, catalog?.entries ?? {}),
    [subs, catalog],
  );

  const sync = useCallback(async (mode: SyncMode = "incremental") => {
    if (running.current) return;
    running.current = true;
    setStatus({ ...IDLE, running: true, mode, phase: "Starting" });
    try {
      await runSync(mode, (patch) => setStatus((s) => ({ ...s, ...patch })));
      setStatus({ ...IDLE });
    } catch (e) {
      setStatus({
        ...IDLE,
        error: e instanceof Error ? e.message : String(e),
        authError: e instanceof ClientAuthError,
      });
    } finally {
      running.current = false;
    }
  }, []);

  /** Save a cookie after LeetCode confirms it. Resolves to an error message, or null on success. */
  const connect = useCallback(
    async (raw: string): Promise<string | null> => {
      const { session, csrf } = parseCookies(raw);
      if (!session) return "Paste your LEETCODE_SESSION value.";
      try {
        const { username } = await whoami({ session, csrf });
        if (!username) return "LeetCode says that cookie isn't signed in. Copy it again.";
        if (!writeStore(KEYS.credentials, { session, csrf: csrf || undefined, username })) {
          return "Your browser wouldn't save the cookie (storage blocked).";
        }
        void sync("incremental"); // pull the history straight away
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Could not connect.";
      }
    },
    [sync],
  );

  const disconnect = useCallback(async () => {
    writeStore(KEYS.credentials, null);
    setStatus(IDLE);
  }, []);

  const listTotals: ListTotals | null = catalog?.totals ?? null;

  return {
    ready,
    connected: !!creds,
    username: creds?.username ?? null,
    lastSyncedAt: meta.lastSyncedAt,
    hasData: meta.lastSyncedAt !== null,
    records,
    listTotals,
    status,
    sync,
    connect,
    disconnect,
  };
}

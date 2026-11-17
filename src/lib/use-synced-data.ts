"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { whoami, ClientAuthError } from "@/lib/lc-client";
import {
  KEYS,
  loadMeta,
  useStoreReady,
  useStored,
  writeStore,
  type StoredCatalog,
  type StoredMeta,
} from "@/lib/local-store";
import { buildRecords } from "@/lib/records";
import { runSync } from "@/lib/sync-client";
import type {
  CatalogEntry,
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
  auto: false,
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
const NO_ENTRIES: Record<string, CatalogEntry> = {};

/** an automatic sync runs when the last one is older than this */
const AUTO_STALE_AFTER = 10 * 60 * 1000;
/** and never more often than this, even if a sync keeps failing */
const AUTO_MIN_GAP = 60 * 1000;

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
  const lastAttempt = useRef(0);
  const needsNewCookie = useRef(false);

  const records = useMemo<ProblemRecord[]>(
    () => buildRecords(subs, catalog?.entries ?? {}),
    [subs, catalog],
  );

  const sync = useCallback(async (mode: SyncMode = "incremental", auto = false) => {
    if (running.current) return;
    running.current = true;
    lastAttempt.current = Date.now();
    setStatus({ ...IDLE, running: true, mode, phase: "Starting", auto });
    try {
      await runSync(mode, (patch) => setStatus((s) => ({ ...s, ...patch })));
      needsNewCookie.current = false;
      setStatus({ ...IDLE });
    } catch (e) {
      const authError = e instanceof ClientAuthError;
      needsNewCookie.current = authError;
      setStatus({
        ...IDLE,
        error: e instanceof Error ? e.message : String(e),
        authError,
      });
    } finally {
      running.current = false;
    }
  }, []);

  // Pull new solves by itself: when the app opens and whenever you come back to the tab,
  // if the last sync is more than a few minutes old. It never retries an expired cookie.
  const connected = !!creds;
  const session = creds?.session;

  // A different cookie showed up, pasted here or synced down from another computer. The old one
  // is no longer the problem, so forget the "expired" block and let the next check try again.
  useEffect(() => {
    needsNewCookie.current = false;
    lastAttempt.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus((s) => (s.authError ? { ...IDLE } : s));
  }, [session]);

  useEffect(() => {
    if (!ready || !connected) return;
    const maybeSync = () => {
      if (document.visibilityState !== "visible" || running.current) return;
      if (needsNewCookie.current) return;
      const now = Date.now();
      if (now - lastAttempt.current < AUTO_MIN_GAP) return;
      const last = loadMeta().lastSyncedAt;
      if (last !== null && now - last < AUTO_STALE_AFTER) return;
      void sync("incremental", true);
    };
    maybeSync();
    document.addEventListener("visibilitychange", maybeSync);
    window.addEventListener("focus", maybeSync);
    return () => {
      document.removeEventListener("visibilitychange", maybeSync);
      window.removeEventListener("focus", maybeSync);
    };
  }, [ready, connected, session, sync]);

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
        needsNewCookie.current = false;
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
    summary: meta.summary ?? null,
    records,
    catalogEntries: catalog?.entries ?? NO_ENTRIES,
    listTotals,
    status,
    sync,
    connect,
    disconnect,
  };
}

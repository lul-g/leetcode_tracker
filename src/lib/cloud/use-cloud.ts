"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStored, writeStore } from "@/lib/local-store";
import { applyRows, isFirstSync, planChanges, type Change } from "./engine";
import { createHttpBackend, fetchStatus, type DbHealth } from "./http-backend";
import {
  CHANGE_EVENTS,
  SYNC_KEY_STORE,
  readLocalRows,
  readMeta,
  writeLocalRows,
  writeMeta,
} from "./sections";
import { BadKeyError, NotConfiguredError } from "./types";

export type CloudStatus =
  | "checking" // asking the server whether sync is set up
  | "unconfigured" // the server has no database / sync key
  | "noKey" // set up, but this computer hasn't been given the key
  | "syncing"
  | "synced"
  | "badKey" // the server refused this computer's key
  | "error";

export type CloudState = {
  /** has the server been set up for sync? null until we've asked */
  serverConfigured: boolean | null;
  /** names of the server settings that are missing, when sync isn't set up */
  missing: string[];
  /** can the server reach its table? null until known or when sync isn't set up */
  db: DbHealth | null;
  hasKey: boolean;
  status: CloudStatus;
  error: string | null;
  lastSyncedAt: number | null;
  setKey: (key: string) => void;
  clearKey: () => void;
  syncNow: () => Promise<void>;
};

/** push a local change to the cloud this long after the last edit */
const PUSH_DELAY = 3000;
/** don't re-sync on tab focus more often than this */
const FOCUS_GAP = 60_000;
/** rows per request, so a big first upload stays well under the host's body limit */
const BATCH = 150;

/**
 * Keeps this browser's settings, card layout, manual solves, notes, completed problems and
 * cookie in step with your cloud copy, once this computer has the sync key. Without the key (or
 * with sync not set up on the server) it does nothing and the app behaves as before.
 */
export function useCloud(): CloudState {
  const key = useStored<string | null>(SYNC_KEY_STORE, null);
  const keyRef = useRef<string | null>(key);
  const backend = useMemo(() => createHttpBackend(), []);

  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [db, setDb] = useState<DbHealth | null>(null);
  const [status, setStatus] = useState<CloudStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const running = useRef(false);
  const again = useRef(false);
  const applying = useRef(false);
  const lastRun = useRef(0);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  /** One full pull, merge and push. */
  const runOnce = useCallback(async () => {
    const syncKey = keyRef.current;
    if (!syncKey) {
      setStatus("noKey");
      return;
    }
    setStatus("syncing");
    setError(null);
    try {
      let meta = readMeta();
      // decided once per run, so every batch of a first sync is treated the same way
      const first = isFirstSync(meta);
      const planned = planChanges(readLocalRows(), meta, Date.now());
      meta = planned.meta;
      // small rows first (settings, notes...), the bulky problem history after
      const queue = [...planned.changes].sort(
        (a, b) => Number(a.table === "problems") - Number(b.table === "problems"),
      );
      const batches: Change[][] = [];
      for (let i = 0; i < queue.length; i += BATCH) batches.push(queue.slice(i, i + BATCH));
      if (!batches.length) batches.push([]); // nothing to send: still pull what changed

      for (const changes of batches) {
        const { rows, cursor } = await backend.sync(syncKey, { cursor: meta.cursor, first, changes });
        const pushed = new Set(changes.map((c) => `${c.table}|${c.key}`));
        const out = applyRows({ local: readLocalRows(), meta, rows, pushed, cursor });
        applying.current = true;
        try {
          writeLocalRows(out.writes);
        } finally {
          applying.current = false;
        }
        meta = out.meta;
        writeMeta(meta);
      }
      lastRun.current = Date.now();
      setLastSyncedAt(lastRun.current);
      setStatus("synced");
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        setServerConfigured(false);
        setStatus("unconfigured");
      } else if (e instanceof BadKeyError) {
        setStatus("badKey");
        setError(e.message);
      } else {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }, [backend]);

  /** Sync now; if something asks for another sync while one is running, run it right after. */
  const syncNow = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        await runOnce();
      } while (again.current);
    } finally {
      running.current = false;
    }
  }, [runOnce]);

  // is the server set up for sync at all?
  useEffect(() => {
    let alive = true;
    void fetchStatus().then((s) => {
      if (!alive) return;
      setServerConfigured(s.configured);
      setMissing(s.missing);
      setDb(s.db);
      if (!s.configured) setStatus("unconfigured");
    });
    return () => {
      alive = false;
    };
  }, []);

  // sync as soon as this computer has the key and the server is ready
  const ready = serverConfigured === true;
  const hasKey = !!key;
  useEffect(() => {
    if (!ready) return;
    if (!hasKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("noKey");
      return;
    }
    void syncNow();
  }, [ready, hasKey, key, syncNow]);

  // push edits shortly after they happen, and note when they happened
  useEffect(() => {
    if (!ready || !hasKey) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      if (applying.current) return;
      // note when each edit happened (an edit's age decides who wins), then sync shortly after
      writeMeta(planChanges(readLocalRows(), readMeta(), Date.now()).meta);
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), PUSH_DELAY);
    };
    CHANGE_EVENTS.forEach((e) => window.addEventListener(e, onChange));
    window.addEventListener("storage", onChange);
    return () => {
      clearTimeout(timer);
      CHANGE_EVENTS.forEach((e) => window.removeEventListener(e, onChange));
      window.removeEventListener("storage", onChange);
    };
  }, [ready, hasKey, syncNow]);

  // pick up changes made on another computer when you come back to this tab
  useEffect(() => {
    if (!ready || !hasKey) return;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRun.current < FOCUS_GAP) return;
      void syncNow();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, hasKey, syncNow]);

  const setKey = useCallback((k: string) => {
    const trimmed = k.trim();
    if (!trimmed) return;
    writeMeta(null); // a new key means a fresh start with whatever it unlocks
    writeStore(SYNC_KEY_STORE, trimmed);
  }, []);
  const clearKey = useCallback(() => {
    writeStore(SYNC_KEY_STORE, null);
    writeMeta(null); // forget what we'd agreed on; the data on this computer stays
    setLastSyncedAt(null);
    setError(null);
  }, []);

  return {
    serverConfigured,
    missing,
    db,
    hasKey,
    status,
    error,
    lastSyncedAt,
    setKey,
    clearKey,
    syncNow,
  };
}


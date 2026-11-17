"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStored, writeStore } from "@/lib/local-store";
import { emptyMeta, noteLocalChanges, reconcile } from "./engine";
import { createHttpBackend, fetchStatus, type DbHealth } from "./http-backend";
import {
  CHANGE_EVENTS,
  SYNC_KEY_STORE,
  readLocalRaw,
  readMeta,
  writeLocalRaw,
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
const OWNER = "owner";

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
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, version } = await backend.load(syncKey);
        // an empty database (a new project) has nothing to agree on: start over and upload it all
        const stored = version === null ? { uid: OWNER, meta: emptyMeta() } : readMeta();

        const res = reconcile({
          local: readLocalRaw(),
          remote: data,
          meta: stored.meta,
          now: Date.now(),
        });

        if (Object.keys(res.pushRemote).length) {
          const saved = await backend.save(syncKey, { ...data, ...res.pushRemote }, version);
          if (!saved.ok) {
            if (saved.conflict) continue; // another computer wrote meanwhile: read again and retry
            throw new Error(saved.error);
          }
        }

        applying.current = true;
        try {
          writeLocalRaw(res.writeLocal);
        } finally {
          applying.current = false;
        }
        writeMeta({ uid: OWNER, meta: res.meta });
        lastRun.current = Date.now();
        setLastSyncedAt(lastRun.current);
        setStatus("synced");
        return;
      }
      throw new Error("Another computer kept changing things. Try again in a moment.");
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
      const stored = readMeta();
      writeMeta({
        uid: stored.uid,
        meta: noteLocalChanges(readLocalRaw(), stored.meta, Date.now()),
      });
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


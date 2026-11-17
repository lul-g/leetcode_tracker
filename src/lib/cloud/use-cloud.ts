"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloudConfigured, getBackend } from "./config";
import { emptyMeta, noteLocalChanges, reconcile } from "./engine";
import {
  CHANGE_EVENTS,
  readLocalRaw,
  readMeta,
  writeLocalRaw,
  writeMeta,
} from "./sections";
import type { AuthResult, CloudUser } from "./types";

export type CloudStatus = "off" | "signedOut" | "syncing" | "synced" | "error";

export type CloudState = {
  configured: boolean;
  user: CloudUser | null;
  status: CloudStatus;
  error: string | null;
  lastSyncedAt: number | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

/** push a local change to the cloud this long after the last edit */
const PUSH_DELAY = 1500;
/** don't re-sync on tab focus more often than this */
const FOCUS_GAP = 60_000;

/**
 * Keeps this browser's settings, card layout, manual solves, notes and cookie in step with your
 * cloud copy. Signed out (or not configured) it does nothing and the app behaves as before.
 */
export function useCloud(): CloudState {
  const backend = useMemo(() => (typeof window === "undefined" ? null : getBackend()), []);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [status, setStatus] = useState<CloudStatus>(cloudConfigured ? "signedOut" : "off");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const running = useRef(false);
  const again = useRef(false);
  const applying = useRef(false);
  const lastRun = useRef(0);
  const userRef = useRef<CloudUser | null>(null);

  /** One full pull, merge and push. */
  const runOnce = useCallback(async () => {
    if (!backend) return;
    setStatus("syncing");
    setError(null);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const u = await backend.getUser();
        if (!u) {
          setStatus("signedOut");
          return;
        }
        // a different person signing in on this browser starts from a clean slate
        let stored = readMeta();
        if (stored.uid !== u.id) stored = { uid: u.id, meta: emptyMeta() };

        const { data, version } = await backend.load();
        const res = reconcile({
          local: readLocalRaw(),
          remote: data,
          meta: stored.meta,
          now: Date.now(),
        });

        if (Object.keys(res.pushRemote).length) {
          const saved = await backend.save({ ...data, ...res.pushRemote }, version);
          if (!saved.ok) {
            if (saved.conflict) continue; // another device wrote meanwhile: read again and retry
            throw new Error(saved.error);
          }
        }

        applying.current = true;
        try {
          writeLocalRaw(res.writeLocal);
        } finally {
          applying.current = false;
        }
        writeMeta({ uid: u.id, meta: res.meta });
        lastRun.current = Date.now();
        setLastSyncedAt(lastRun.current);
        setStatus("synced");
        return;
      }
      throw new Error("Another device kept changing things. Try again in a moment.");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [backend]);

  /** Sync now; if something asks for another sync while one is running, run it right after. */
  const syncNow = useCallback(async () => {
    if (!backend) return;
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
  }, [backend, runOnce]);

  // who is signed in; sync as soon as someone is
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    const apply = (u: CloudUser | null) => {
      if (!alive) return;
      userRef.current = u;
      setUser(u);
      if (u) void syncNow();
      else setStatus("signedOut");
    };
    void backend.getUser().then(apply);
    const off = backend.onAuthChange(apply);
    return () => {
      alive = false;
      off();
    };
  }, [backend, syncNow]);

  // push edits shortly after they happen, and note when they happened
  useEffect(() => {
    if (!backend || !user) return;
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
  }, [backend, user, syncNow]);

  // pick up changes made on another computer when you come back to this tab
  useEffect(() => {
    if (!backend || !user) return;
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
  }, [backend, user, syncNow]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> =>
      backend ? backend.signIn(email.trim(), password) : { error: "Cloud sync isn't set up." },
    [backend],
  );
  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> =>
      backend ? backend.signUp(email.trim(), password) : { error: "Cloud sync isn't set up." },
    [backend],
  );
  const signOut = useCallback(async () => {
    await backend?.signOut();
    writeMeta(null); // forget what we'd agreed on; the data on this browser stays
    setLastSyncedAt(null);
  }, [backend]);

  return {
    configured: cloudConfigured,
    user,
    status,
    error,
    lastSyncedAt,
    signIn,
    signUp,
    signOut,
    syncNow,
  };
}

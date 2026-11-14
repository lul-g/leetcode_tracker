"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Annotation = { note: string; review: boolean };

const KEY = "lc-tracker-notes";
const EVENT = "lc-tracker-notes-change";
const EMPTY: Annotation = { note: "", review: false };

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/** Per-problem notes and "needs review" flags, kept in this browser until the sync/db exists. */
export function useNotes() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const all = useMemo<Record<string, Annotation>>(() => {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [raw]);

  const get = useCallback((slug: string): Annotation => all[slug] ?? EMPTY, [all]);

  const set = useCallback(
    (slug: string, patch: Partial<Annotation>) => {
      const next = { ...all, [slug]: { ...(all[slug] ?? EMPTY), ...patch } };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [all],
  );

  return { get, set, all };
}

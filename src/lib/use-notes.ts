"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { localToday } from "@/lib/pace";

/** Why a problem was flagged for another go: you leaned on hints, or you read the solution. */
export type ReviewReason = "hint" | "solution";

export type Annotation = {
  note: string;
  /** flagged to do again */
  review: boolean;
  /** why it was flagged (only while flagged) */
  reason?: ReviewReason;
  /** your own category for this problem; replaces the NeetCode one */
  category?: string;
  /** days you flagged it, redid it and cleared the flag, oldest first */
  redone?: string[];
};

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

/** Keep stored annotations tidy: optional fields are left out when empty, so the same data always looks the same everywhere (it syncs). */
function tidy(a: Annotation): Annotation {
  const out: Annotation = { note: a.note, review: a.review };
  if (a.review && a.reason) out.reason = a.reason;
  const cat = a.category?.trim();
  if (cat) out.category = cat;
  if (a.redone?.length) out.redone = a.redone;
  return out;
}

/** Per-problem notes, review flags (with why), categories and redo history, kept in this browser and synced. */
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
      const before = all[slug] ?? EMPTY;
      const merged: Annotation = { ...before, ...patch };
      // clearing the flag after having flagged it means you redid it: remember the day
      if (before.review && !merged.review) {
        const day = localToday();
        const done = before.redone ?? [];
        merged.redone = done[done.length - 1] === day ? done : [...done, day];
      }
      if (!merged.review) delete merged.reason;
      const next = { ...all, [slug]: tidy(merged) };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [all],
  );

  return { get, set, all };
}

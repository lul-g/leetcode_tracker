"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_GOAL } from "@/lib/data";
import { localToday, type GoalSettings } from "@/lib/pace";

const KEY = "lc-tracker-settings";
const EVENT = "lc-tracker-settings-change";

// TODO: replace with the real default once the target date is set in-app.
const DEFAULTS: GoalSettings = {
  goal: DEFAULT_GOAL,
  startDate: "2026-11-01",
  targetDate: "2027-03-01",
};

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

const noopSubscribe = () => () => {};

/**
 * Goal settings (persisted in localStorage for now) and today's local date.
 * `today` is null on the server and first paint so markup matches.
 */
export function useSettings() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const settings = useMemo<GoalSettings>(() => {
    try {
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  }, [raw]);

  const update = useCallback((next: GoalSettings) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { settings, update, today: mounted ? localToday() : null };
}

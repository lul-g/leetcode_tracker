"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Which cards the dashboard shows, in what order and size. Kept in this browser and synced with the
 * rest of your data (the "layout" row). The dashboard grid and the "add to dashboard" buttons on
 * other pages both go through here, so they always agree.
 */
export type LayoutItem = { id: string; w: number; h: number };

const KEY = "lc-tracker-layout-v3";
const EVENT = "lc-tracker-layout-change";
export const COLS = 12;
export const MIN_W = 3;
export const MIN_H = 3;
export const MAX_H = 14;

/** Size each card starts at when it is added (columns x row units). */
const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  hero: { w: 4, h: 6 },
  pace: { w: 8, h: 9 },
  today: { w: 4, h: 3 },
  range: { w: 8, h: 7 },
  calendar: { w: 4, h: 7 },
  heatmap: { w: 12, h: 4 },
  recent: { w: 6, h: 6 },
  topics: { w: 6, h: 6 },
  "p-target": { w: 4, h: 6 },
  "p-perday": { w: 4, h: 4 },
  "p-chart": { w: 8, h: 6 },
  "p-history": { w: 6, h: 5 },
  "p-overview": { w: 6, h: 6 },
};
const FALLBACK = { w: 6, h: 6 };

/** What a fresh dashboard shows; everything else is one click away in "Customize". */
const DEFAULT_VISIBLE = ["hero", "pace", "today", "calendar", "range"];

export const sizeOf = (id: string) => DEFAULT_SIZE[id] ?? FALLBACK;
const defaults = (ids: string[]): LayoutItem[] =>
  DEFAULT_VISIBLE.filter((id) => ids.includes(id)).map((id) => ({ id, ...sizeOf(id) }));

export const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)));

export const layoutSubscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
export const layoutRead = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/** A saved layout is the list of cards you chose, in order, with their sizes. */
export function normalize(saved: unknown, ids: string[]): LayoutItem[] {
  if (!Array.isArray(saved)) return defaults(ids);
  const seen = new Set<string>();
  const out: LayoutItem[] = [];
  for (const s of saved) {
    if (!s || !ids.includes(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    const base = sizeOf(s.id);
    out.push({
      id: s.id,
      w: clamp(Number(s.w) || base.w, MIN_W, COLS),
      h: clamp(Number(s.h) || base.h, MIN_H, MAX_H),
    });
  }
  return out;
}

export function persistLayout(items: LayoutItem[] | null) {
  try {
    if (items) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const parse = (raw: string | null, ids: string[]) => {
  try {
    return normalize(raw ? JSON.parse(raw) : null, ids);
  } catch {
    return normalize(null, ids);
  }
};

/** Is this card on the dashboard, and a way to put it there or take it off. */
export function useDashboardCard(id: string, allIds: string[]) {
  const raw = useSyncExternalStore(layoutSubscribe, layoutRead, () => null);
  const key = allIds.join("|");
  const items = useMemo(() => parse(raw, key.split("|")), [raw, key]);
  const on = items.some((x) => x.id === id);
  const toggle = useCallback(() => {
    persistLayout(on ? items.filter((x) => x.id !== id) : [...items, { id, ...sizeOf(id) }]);
  }, [on, items, id]);
  return { on, toggle };
}

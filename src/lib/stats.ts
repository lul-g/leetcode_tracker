import type { Difficulty } from "@/lib/data";
import { addDays, daysBetween, type Solve } from "@/lib/pace";

export type DayCount = Record<Difficulty, number> & { total: number };
export type DayMap = Map<string, DayCount>;

const empty = (): DayCount => ({ easy: 0, medium: 0, hard: 0, total: 0 });

/** Solves per local day, only for days from `startDate` through `today`. */
export function byDay(solves: Solve[], startDate: string, today: string): DayMap {
  const m: DayMap = new Map();
  for (const s of solves) {
    if (s.date < startDate || s.date > today) continue;
    const c = m.get(s.date) ?? empty();
    c[s.difficulty]++;
    c.total++;
    m.set(s.date, c);
  }
  return m;
}

export const countOn = (days: DayMap, date: string) => days.get(date)?.total ?? 0;

export function streaks(days: DayMap, startDate: string, today: string) {
  const span = Math.max(0, daysBetween(startDate, today) + 1);
  let best = 0;
  let run = 0;
  let active = 0;
  for (let i = 0; i < span; i++) {
    if (countOn(days, addDays(startDate, i)) > 0) {
      run++;
      active++;
      best = Math.max(best, run);
    } else run = 0;
  }
  // today may still be open: the streak stays alive until the day ends
  let current = 0;
  let d = countOn(days, today) > 0 ? today : addDays(today, -1);
  while (d >= startDate && countOn(days, d) > 0) {
    current++;
    d = addDays(d, -1);
  }
  return { current, best, active };
}

export type RangeId = "7d" | "30d" | "90d" | "180d" | "365d" | "all";

export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: "7d", label: "Week", days: 7 },
  { id: "30d", label: "Month", days: 30 },
  { id: "90d", label: "3M", days: 90 },
  { id: "180d", label: "6M", days: 180 },
  { id: "365d", label: "12M", days: 365 },
  { id: "all", label: "All", days: null },
];

export type Bucket = DayCount & { key: string; start: string; end: string };

export type RangeStats = {
  total: number;
  /** days in the window that fall on/after the start date */
  span: number;
  avg: number;
  active: number;
  best: { count: number; date: string | null };
  /** change vs the previous equal-length window; null when that window predates the start date */
  delta: number | null;
  unit: "day" | "week" | "month";
  buckets: Bucket[];
};

const sumRange = (days: DayMap, from: string, to: string) => {
  let t = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) t += countOn(days, d);
  return t;
};

export function rangeStats(
  days: DayMap,
  rangeId: RangeId,
  startDate: string,
  today: string,
): RangeStats {
  const range = RANGES.find((r) => r.id === rangeId)!;
  const windowStart = range.days ? addDays(today, -(range.days - 1)) : startDate;
  const from = windowStart < startDate ? startDate : windowStart;
  const span = Math.max(0, daysBetween(from, today) + 1);

  let total = 0;
  let active = 0;
  let best = { count: 0, date: null as string | null };
  for (let i = 0; i < span; i++) {
    const d = addDays(from, i);
    const n = countOn(days, d);
    total += n;
    if (n > 0) active++;
    if (n > best.count) best = { count: n, date: d };
  }

  let delta: number | null = null;
  if (range.days) {
    const prevStart = addDays(windowStart, -range.days);
    if (prevStart >= startDate) {
      delta = total - sumRange(days, prevStart, addDays(windowStart, -1));
    }
  }

  const unit = span <= 31 ? "day" : span <= 400 ? "week" : "month";
  const buckets: Bucket[] = [];
  if (span > 0) {
    if (unit === "day") {
      for (let i = 0; i < span; i++) {
        const d = addDays(from, i);
        buckets.push({ ...(days.get(d) ?? empty()), key: d, start: d, end: d });
      }
    } else if (unit === "week") {
      // 7-day chunks aligned to today so the latest bar is a full week
      const n = Math.ceil(span / 7);
      for (let i = n - 1; i >= 0; i--) {
        const end = addDays(today, -7 * i);
        let start = addDays(end, -6);
        if (start < from) start = from;
        buckets.push(chunk(days, start, end));
      }
    } else {
      let cursor = from;
      while (cursor <= today) {
        const monthEnd = lastOfMonth(cursor);
        const end = monthEnd < today ? monthEnd : today;
        buckets.push(chunk(days, cursor, end));
        cursor = addDays(end, 1);
      }
    }
  }

  return {
    total,
    span,
    avg: span ? total / span : 0,
    active,
    best,
    delta,
    unit,
    buckets,
  };
}

function chunk(days: DayMap, start: string, end: string): Bucket {
  const c = empty();
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const x = days.get(d);
    if (!x) continue;
    c.easy += x.easy;
    c.medium += x.medium;
    c.hard += x.hard;
    c.total += x.total;
  }
  return { ...c, key: start, start, end };
}

function lastOfMonth(d: string) {
  const [y, m] = d.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/** Weeks (Sun to Sat) covering the 53 weeks that end with the current week. */
export function heatmapWeeks(today: string) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lastSat = addDays(today, 6 - dow);
  const firstSun = addDays(lastSat, -(53 * 7 - 1));
  const weeks: string[][] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(firstSun, w * 7 + i)));
  }
  return weeks;
}

/** Month grid (Sun to Sat) for the month containing `anchor` (YYYY-MM-01). */
export function monthGrid(anchor: string) {
  const dow = new Date(`${anchor}T00:00:00Z`).getUTCDay();
  const first = addDays(anchor, -dow);
  const [y, m] = anchor.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rows = Math.ceil((dow + daysInMonth) / 7);
  return Array.from({ length: rows * 7 }, (_, i) => addDays(first, i));
}

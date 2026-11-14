import type { Difficulty } from "@/lib/data";

/** A solve counts on the local calendar day of its first accepted submission. */
export type Solve = { date: string; difficulty: Difficulty; topic?: string }; // date: YYYY-MM-DD

export type GoalSettings = {
  goal: number;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
};

export type PaceStatus =
  | "not_started"
  | "ahead"
  | "on_track"
  | "behind"
  | "reached"
  | "passed";

const DAY = 86_400_000;

const parse = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};

export const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Whole days from a to b (b - a). Uses UTC midnights, so DST can't skew it. */
export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b) - parse(a)) / DAY);

export const addDays = (d: string, n: number) => toISO(parse(d) + n * DAY);

/** Today's date in the viewer's local timezone. */
export const localToday = () => {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
};

export type Pace = {
  solved: number;
  remaining: number;
  /** days in the plan, start and target both included */
  totalDays: number;
  /** days elapsed including today (0 before start) */
  elapsedDays: number;
  /** days left including today (0 after target) */
  daysLeft: number;
  requiredPerDay: number;
  requiredPerWeek: number;
  pace7: number;
  pace30: number;
  /** where solved "should" be today on the straight line */
  ideal: number;
  /** solved - ideal (positive = ahead) */
  delta: number;
  /** delta expressed in days of required pace */
  deltaDays: number;
  projectedFinish: string | null;
  /** projected finish vs target in days (negative = early) */
  projectedVsTarget: number | null;
  status: PaceStatus;
};

export function computePace(
  solves: Solve[],
  s: GoalSettings,
  today: string,
): Pace {
  const totalDays = Math.max(1, daysBetween(s.startDate, s.targetDate) + 1);
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, daysBetween(s.startDate, today) + 1),
  );
  const daysLeft = Math.max(0, daysBetween(today, s.targetDate) + 1);

  const counted = solves.filter((x) => x.date >= s.startDate && x.date <= today);
  const solved = counted.length;
  const remaining = Math.max(0, s.goal - solved);

  const requiredPerDay = daysLeft > 0 ? remaining / daysLeft : remaining;

  const windowPace = (n: number) => {
    const from = addDays(today, -(n - 1));
    const inWindow = counted.filter((x) => x.date >= from).length;
    // before n days have passed, average over the days that exist
    const span = Math.max(1, Math.min(n, elapsedDays));
    return inWindow / span;
  };
  const pace7 = windowPace(7);
  const pace30 = windowPace(30);

  const ideal = (s.goal * elapsedDays) / totalDays;
  const delta = solved - ideal;
  const perDayPlan = s.goal / totalDays;

  let projectedFinish: string | null = null;
  let projectedVsTarget: number | null = null;
  if (remaining === 0) {
    projectedFinish = today;
  } else if (pace7 > 0) {
    projectedFinish = addDays(today, Math.ceil(remaining / pace7));
    projectedVsTarget = daysBetween(s.targetDate, projectedFinish);
  }

  let status: PaceStatus;
  if (solved >= s.goal) status = "reached";
  else if (today > s.targetDate) status = "passed";
  else if (today < s.startDate) status = "not_started";
  else if (delta >= 1) status = "ahead";
  else if (delta <= -1) status = "behind";
  else status = "on_track";

  return {
    solved,
    remaining,
    totalDays,
    elapsedDays,
    daysLeft,
    requiredPerDay,
    requiredPerWeek: requiredPerDay * 7,
    pace7,
    pace30,
    ideal,
    delta,
    deltaDays: perDayPlan > 0 ? delta / perDayPlan : 0,
    projectedFinish,
    projectedVsTarget,
    status,
  };
}

export type SeriesPoint = { day: number; total: number };

/** Cumulative solves by day index from the start date (day 0 = start) up to today. */
export function cumulativeSeries(
  solves: Solve[],
  startDate: string,
  today: string,
  only?: Difficulty | null,
): SeriesPoint[] {
  const last = Math.max(0, daysBetween(startDate, today));
  const perDay = new Array<number>(last + 1).fill(0);
  for (const x of solves) {
    if (only && x.difficulty !== only) continue;
    const i = daysBetween(startDate, x.date);
    if (i >= 0 && i <= last) perDay[i] += 1;
  }
  let total = 0;
  return perDay.map((n, day) => ({ day, total: (total += n) }));
}

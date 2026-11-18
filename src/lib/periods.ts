import { addDays, daysBetween, toISO, type GoalSettings, type Solve } from "@/lib/pace";

/**
 * Weekly / monthly / quarterly / half-year targets, all derived from ONE number: the weekly goal.
 *
 *  - Work days are Monday to Friday; Saturday and Sunday are rest days.
 *  - The weekly goal spreads evenly over a week's 5 work days (`rate` per work day).
 *  - A period's NORMAL target is `rate` x the work days inside it (and inside the plan).
 *  - ROLLOVER: whatever you are behind (or ahead) of the normal pace going into a period is added
 *    to it. Behind by 4 means the period asks for 4 more; ahead by 4 means it asks for 4 fewer.
 *    The same rule applies to every period type, so it flows from week to month to half-year.
 *  - Periods are calendar-aligned (Monday weeks, calendar months, quarters and halves). The plan's
 *    start date only decides where counting begins; it never moves a period's edges.
 */
export type PeriodKind = "week" | "month" | "quarter" | "half";

export const PERIOD_KINDS: { id: PeriodKind; label: string; noun: string }[] = [
  { id: "week", label: "Week", noun: "week" },
  { id: "month", label: "Month", noun: "month" },
  { id: "quarter", label: "Quarter", noun: "quarter" },
  { id: "half", label: "6 mo", noun: "half-year" },
];

const WORKDAYS_PER_WEEK = 5;

const parse = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};
/** 0 = Monday ... 6 = Sunday */
const weekday = (d: string) => (new Date(parse(d)).getUTCDay() + 6) % 7;
export const isWorkday = (d: string) => weekday(d) < WORKDAYS_PER_WEEK;

/** Monday-to-Friday days in [a, b], both included (0 when b is before a). */
export function workdaysBetween(a: string, b: string): number {
  const n = daysBetween(a, b) + 1;
  if (n <= 0) return 0;
  let count = Math.floor(n / 7) * WORKDAYS_PER_WEEK;
  const first = weekday(a);
  for (let i = 0; i < n % 7; i++) if ((first + i) % 7 < WORKDAYS_PER_WEEK) count++;
  return count;
}

const monthRange = (y: number, m: number, span: number) => {
  // m is 0-based and may over/underflow; Date.UTC normalises it
  const start = toISO(Date.UTC(y, m, 1));
  const end = toISO(Date.UTC(y, m + span, 0));
  return { start, end };
};

/** The calendar period of this kind that is `offset` periods before/after the one holding `date`. */
export function periodRange(kind: PeriodKind, date: string, offset = 0): { start: string; end: string } {
  if (kind === "week") {
    const start = addDays(date, -weekday(date) + 7 * offset);
    return { start, end: addDays(start, 6) };
  }
  const [y, m] = date.split("-").map(Number);
  if (kind === "month") return monthRange(y, m - 1 + offset, 1);
  if (kind === "quarter") return monthRange(y, Math.floor((m - 1) / 3) * 3 + 3 * offset, 3);
  return monthRange(y, Math.floor((m - 1) / 6) * 6 + 6 * offset, 6);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

export function periodLabel(kind: PeriodKind, start: string, end: string): string {
  const y = start.slice(0, 4);
  const m = Number(start.slice(5, 7));
  if (kind === "week") return `${short(start)} to ${short(end)}`;
  if (kind === "month") return `${MONTHS[m - 1]} ${y}`;
  if (kind === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
  return `${MONTHS[m - 1]} to ${MONTHS[Number(end.slice(5, 7)) - 1]} ${y}`;
}

/** The weekly goal the app proposes: the goal spread over the plan's work days. */
export function autoWeeklyGoal(s: Pick<GoalSettings, "goal" | "startDate" | "targetDate">): number {
  const work = workdaysBetween(s.startDate, s.targetDate);
  if (work <= 0) return Math.max(1, s.goal);
  return Math.max(1, Math.ceil((s.goal / work) * WORKDAYS_PER_WEEK));
}

/** The weekly goal in force: yours if you set one, else the proposal. */
export const weeklyGoalOf = (s: GoalSettings) =>
  s.weeklyGoal && s.weeklyGoal > 0 ? s.weeklyGoal : autoWeeklyGoal(s);

const countBetween = (solves: Solve[], a: string, b: string) => {
  let n = 0;
  for (const x of solves) if (x.date >= a && x.date <= b) n++;
  return n;
};

export type Bucket = {
  start: string;
  end: string;
  label: string;
  solved: number;
  /** the normal (no rollover) target inside this bucket */
  normal: number;
};

export type PeriodInfo = {
  kind: PeriodKind;
  start: string;
  end: string;
  label: string;
  isCurrent: boolean;
  /** the normal number: weekly pace x work days in this period */
  normal: number;
  /** behind (+) or ahead (-) of normal pace going in; added to the normal number */
  carry: number;
  /** what you need this period to be on pace, never below 0 */
  total: number;
  solved: number;
  left: number;
  /** work days still ahead, today included */
  workdaysLeft: number;
  /** left / workdaysLeft, null when no work days remain */
  perDay: number | null;
  buckets: Bucket[];
};

/**
 * Everything about one period. `offset` 0 is the period holding `today`, -1 the one before, and so
 * on. Solves count from the plan's start date.
 */
export function computePeriod(
  solves: Solve[],
  s: GoalSettings,
  today: string,
  kind: PeriodKind,
  offset = 0,
): PeriodInfo {
  const rate = weeklyGoalOf(s) / WORKDAYS_PER_WEEK;
  const { start, end } = periodRange(kind, today, offset);

  // the part of the period that is inside the plan
  const from = start < s.startDate ? s.startDate : start;
  const to = end > s.targetDate ? s.targetDate : end;
  const normal = rate * workdaysBetween(from, to);

  // everything that should have been done before this period began, vs what was
  const before = addDays(start, -1);
  const priorTo = before > s.targetDate ? s.targetDate : before;
  const carry = rate * workdaysBetween(s.startDate, priorTo) - countBetween(solves, s.startDate, before);

  const total = Math.max(0, Math.ceil(normal + carry - 1e-9));
  const solved = countBetween(solves, from, end < today ? end : today);
  const left = Math.max(0, total - solved);

  const upcomingFrom = today > from ? today : from;
  const workdaysLeft = today > to ? 0 : workdaysBetween(upcomingFrom, to);

  // week/month periods are shown day by day; quarters and halves week by week
  const buckets: Bucket[] = [];
  if (kind === "week" || kind === "month") {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const inPlan = d >= s.startDate && d <= s.targetDate && isWorkday(d);
      buckets.push({
        start: d,
        end: d,
        label: short(d),
        solved: d <= today && d >= s.startDate ? countBetween(solves, d, d) : 0,
        normal: inPlan ? rate : 0,
      });
    }
  } else {
    for (let w = periodRange("week", start).start; w <= end; w = addDays(w, 7)) {
      const a = w < start ? start : w;
      const e = addDays(w, 6);
      const b = e > end ? end : e;
      const pa = a < s.startDate ? s.startDate : a;
      const pb = b > s.targetDate ? s.targetDate : b;
      buckets.push({
        start: a,
        end: b,
        label: short(a),
        solved: pa <= today ? countBetween(solves, pa, b < today ? b : today) : 0,
        normal: rate * workdaysBetween(pa, pb),
      });
    }
  }

  return {
    kind,
    start,
    end,
    label: periodLabel(kind, start, end),
    isCurrent: offset === 0,
    normal,
    carry,
    total,
    solved,
    left,
    workdaysLeft,
    perDay: workdaysLeft > 0 ? left / workdaysLeft : null,
    buckets,
  };
}

/**
 * The normal / catch-up split as whole numbers that add up to the total. Catch-up is negative when
 * you are ahead (it lowers the total).
 */
export function split(p: Pick<PeriodInfo, "normal" | "total">) {
  const normal = Math.round(p.normal);
  return { normal, catchUp: p.total - normal };
}

/** The most recent finished periods of this kind that touch the plan, oldest first. */
export function pastPeriods(
  solves: Solve[],
  s: GoalSettings,
  today: string,
  kind: PeriodKind,
  max = 8,
): PeriodInfo[] {
  const out: PeriodInfo[] = [];
  for (let i = 1; i <= max; i++) {
    const p = computePeriod(solves, s, today, kind, -i);
    if (p.end < s.startDate) break;
    out.unshift(p);
  }
  return out;
}

export type BarSlice = {
  label: string;
  /** width of the slice: what normally has to be done in it */
  size: number;
  /** where the slice starts along the bar */
  from: number;
};

export type PaceBar = {
  kind: PeriodKind;
  label: string;
  /** catch-up carried in from earlier periods, drawn as the first stretch of the bar */
  catchUp: number;
  slices: BarSlice[];
  /** length of the whole bar: catch-up plus the period's normal number */
  length: number;
  /** how far along you are (your solves, plus any credit for being ahead going in) */
  done: number;
  /** how far along you should be by the end of today */
  expected: number;
  /** done - expected: positive = ahead */
  delta: number;
  left: number;
};

/** The pieces a period is cut into: days for a week, weeks for a month, months for a quarter or 6 mo. */
function cut(kind: PeriodKind, start: string, end: string): { label: string; a: string; b: string }[] {
  const out: { label: string; a: string; b: string }[] = [];
  if (kind === "week") {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    for (let i = 0; i < 5; i++) out.push({ label: names[i], a: addDays(start, i), b: addDays(start, i) });
  } else if (kind === "month") {
    for (let w = periodRange("week", start).start; w <= end; w = addDays(w, 7)) {
      const a = w < start ? start : w;
      const e = addDays(w, 6);
      out.push({ label: short(a), a, b: e > end ? end : e });
    }
  } else {
    for (let m = start; m <= end; ) {
      const r = periodRange("month", m);
      out.push({ label: MONTHS[Number(r.start.slice(5, 7)) - 1], a: r.start, b: r.end });
      m = addDays(r.end, 1);
    }
  }
  return out;
}

/**
 * The single bar for the current period. Its length is what it takes to be on pace (catch-up first,
 * then the normal number), cut into days / weeks / months. `done` fills it from the left and
 * `expected` marks where you should be by tonight.
 */
export function computeBar(solves: Solve[], s: GoalSettings, today: string, kind: PeriodKind): PaceBar {
  const rate = weeklyGoalOf(s) / WORKDAYS_PER_WEEK;
  const p = computePeriod(solves, s, today, kind, 0);
  const catchUp = Math.max(0, p.carry);
  const credit = Math.max(0, -p.carry);

  const inPlan = (a: string, b: string) => {
    const x = a < s.startDate ? s.startDate : a;
    const y = b > s.targetDate ? s.targetDate : b;
    return { x, y };
  };

  let cursor = catchUp;
  let expected = catchUp;
  const slices: BarSlice[] = [];
  for (const c of cut(kind, p.start, p.end)) {
    const { x, y } = inPlan(c.a, c.b);
    const size = rate * workdaysBetween(x, y);
    if (size <= 0) continue;
    slices.push({ label: c.label, size, from: cursor });
    cursor += size;
    expected += rate * workdaysBetween(x, y < today ? y : today);
  }

  const done = p.solved + credit;
  return {
    kind,
    label: p.label,
    catchUp,
    slices,
    length: cursor,
    done,
    expected,
    delta: done - expected,
    left: Math.max(0, cursor - done),
  };
}

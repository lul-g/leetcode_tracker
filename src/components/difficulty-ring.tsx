import { Check } from "lucide-react";
import { DIFFICULTIES, type Counts, type Difficulty } from "@/lib/data";

const C = 100;
const R = 82;
const START = 135; // bottom-left, sweeping clockwise 270deg
const GAP = 5; // degrees between segments

const COLOR: Record<Difficulty, string> = {
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
};

const point = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  // round so server and client render identical strings (avoids hydration mismatch)
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(C + R * Math.cos(r)), y: round(C + R * Math.sin(r)) };
};

const arc = (from: number, to: number) => {
  const a = point(from);
  const b = point(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
};

const pct = (n: number, d: number) => (d > 0 ? Math.min(100, (n / d) * 100) : 0);

type Props = {
  solved: Counts;
  totals: Counts;
  /** denominator for the overall center number (goal or list total) */
  overallTotal: number;
  active: Difficulty | null;
  listName: string;
};

export function DifficultyRing({ solved, totals, overallTotal, active, listName }: Props) {
  const solvedAll = solved.easy + solved.medium + solved.hard;
  const seg = (270 - GAP * 2) / 3;

  const centerSolved = active ? solved[active] : solvedAll;
  const centerTotal = active ? totals[active] : overallTotal;
  const centerLabel = active
    ? DIFFICULTIES.find((d) => d.id === active)!.label
    : "Solved";

  return (
    <div
      className="relative aspect-square"
      style={{ width: "min(100cqw, 100cqh, 340px)", containerType: "size" }}
    >
      <svg viewBox="0 0 200 200" className="size-full overflow-visible">
        {/* all three difficulties */}
        <g
          className="transition-opacity duration-300"
          style={{ opacity: active ? 0 : 1 }}
        >
          {DIFFICULTIES.map((d, i) => {
            const from = START + i * (seg + GAP);
            const to = from + seg;
            const p = point(from);
            return (
              <g key={d.id}>
                <path
                  d={arc(from, to)}
                  pathLength={100}
                  fill="none"
                  stroke={COLOR[d.id]}
                  strokeOpacity={0.22}
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <path
                  d={arc(from, to)}
                  pathLength={100}
                  fill="none"
                  stroke={COLOR[d.id]}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={`${pct(solved[d.id], totals[d.id])} 100`}
                  className="transition-[stroke-dasharray] duration-500"
                />
                <circle cx={p.x} cy={p.y} r={4.5} fill={COLOR[d.id]} />
              </g>
            );
          })}
        </g>

        {/* a single difficulty, full sweep */}
        <g
          className="transition-opacity duration-300"
          style={{ opacity: active ? 1 : 0 }}
        >
          {active && (
            <>
              <path
                d={arc(START, START + 270)}
                pathLength={100}
                fill="none"
                stroke={COLOR[active]}
                strokeOpacity={0.22}
                strokeWidth={7}
                strokeLinecap="round"
              />
              <path
                d={arc(START, START + 270)}
                pathLength={100}
                fill="none"
                stroke={COLOR[active]}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${pct(solved[active], totals[active])} 100`}
                className="transition-[stroke-dasharray] duration-500"
              />
              <circle
                cx={point(START).x}
                cy={point(START).y}
                r={4.5}
                fill={COLOR[active]}
              />
            </>
          )}
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {/* sizes track the ring via container-query units (100cqmin = ring diameter) */}
        <div className="leading-none font-semibold tracking-tight tabular-nums">
          <span className="font-bold" style={{ fontSize: "15cqmin" }}>
            {centerSolved}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: "6.5cqmin" }}>
            /{centerTotal}
          </span>
        </div>
        <div
          className="flex items-center gap-1"
          style={{
            color: active ? COLOR[active] : undefined,
            fontSize: "6.5cqmin",
            marginTop: "3cqmin",
          }}
        >
          {!active && <Check className="size-[1em] text-solved" />}
          {centerLabel}
        </div>
        <div
          className="text-muted-foreground"
          style={{ fontSize: "5.2cqmin", marginTop: "4cqmin" }}
        >
          {listName}
        </div>
      </div>
    </div>
  );
}

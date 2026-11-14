"use client";

import { BurnUpChart } from "@/components/burnup-chart";
import { GoalDialog } from "@/components/goal-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DIFFICULTIES, type Difficulty } from "@/lib/data";
import {
  computePace,
  cumulativeSeries,
  type GoalSettings,
  type PaceStatus,
  type Solve,
} from "@/lib/pace";
import { cn } from "@/lib/utils";

const STATUS: Record<PaceStatus, { label: string; cls: string }> = {
  ahead: { label: "Ahead", cls: "bg-solved/15 text-solved" },
  on_track: { label: "On track", cls: "bg-solved/15 text-solved" },
  behind: { label: "Behind", cls: "bg-hard/15 text-hard" },
  reached: { label: "Goal reached", cls: "bg-solved/15 text-solved" },
  passed: { label: "Target passed", cls: "bg-hard/15 text-hard" },
  not_started: { label: "Not started", cls: "bg-muted text-muted-foreground" },
};

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const n1 = (n: number) => (Math.round(n * 10) / 10).toString();

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg leading-tight font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-0 w-4 border-t-2", className)} />
      {label}
    </span>
  );
}

type Props = {
  solves: Solve[];
  settings: GoalSettings;
  onSettings: (s: GoalSettings) => void;
  today: string;
  /** sticky difficulty filter: adds a second line to the chart */
  difficulty: Difficulty | null;
};

export function PacePanel({ solves, settings, onSettings, today, difficulty }: Props) {
  const pace = computePace(solves, settings, today);
  const actual = cumulativeSeries(solves, settings.startDate, today);
  const filtered = difficulty
    ? { difficulty, series: cumulativeSeries(solves, settings.startDate, today, difficulty) }
    : null;

  const st = STATUS[pace.status];
  const showDelta =
    pace.status === "ahead" || pace.status === "behind" || pace.status === "on_track";
  const early = pace.projectedVsTarget;

  return (
    <Card className="@container h-full">
      <CardHeader className="shrink-0">
        <CardTitle className="text-sm font-semibold">Pace</CardTitle>
        <CardDescription>
          {settings.goal} problems by {fmtDate(settings.targetDate)}
        </CardDescription>
        <CardAction className="flex items-center gap-1.5">
          <Badge className={cn("h-6 px-2.5 text-xs font-semibold", st.cls)}>
            {st.label}
          </Badge>
          <GoalDialog settings={settings} onSave={onSettings} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {showDelta && (
          <div className="flex items-baseline gap-2.5">
            <span
              className={cn(
                "text-4xl leading-none font-bold tracking-tighter tabular-nums",
                pace.status === "behind" ? "text-hard" : "text-solved",
              )}
            >
              {pace.delta >= 0 ? "+" : "−"}
              {n1(Math.abs(pace.delta))}
            </span>
            <span className="text-sm text-muted-foreground">
              {pace.delta >= 0 ? "ahead of" : "behind"} pace
              {Math.abs(pace.deltaDays) >= 0.5 &&
                ` · ${n1(Math.abs(pace.deltaDays))} days`}
            </span>
          </div>
        )}

        <div className="flex min-h-44 flex-1 flex-col gap-2">
          <BurnUpChart
            goal={settings.goal}
            startDate={settings.startDate}
            targetDate={settings.targetDate}
            today={today}
            actual={actual}
            filtered={filtered}
            pace={pace.pace7}
          />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <Key className="border-solved" label="Solved" />
            <Key className="border-dashed border-solved/80" label="Projected" />
            <Key className="border-dotted border-muted-foreground" label="Ideal" />
            {difficulty && (
              <Key
                className={cn(
                  difficulty === "easy" && "border-easy",
                  difficulty === "medium" && "border-medium",
                  difficulty === "hard" && "border-hard",
                )}
                label={DIFFICULTIES.find((d) => d.id === difficulty)!.label}
              />
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
          <Stat
            label="Solved"
            value={`${pace.solved}/${settings.goal}`}
            sub={`${pace.remaining} to go`}
          />
          <Stat
            label="Days left"
            value={pace.daysLeft}
            sub={pace.daysLeft ? `of ${pace.totalDays}` : "target passed"}
          />
          <Stat
            label="Required pace"
            value={`${n1(pace.requiredPerDay)}/day`}
            sub={`${n1(pace.requiredPerWeek)}/week`}
          />
          <Stat
            label="Your pace"
            value={`${n1(pace.pace7)}/day`}
            sub={`7-day · ${n1(pace.pace30)}/day over 30`}
          />
        </div>

        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2.5 ring-1 ring-foreground/5">
          <span className="text-xs text-muted-foreground">Projected finish</span>
          {pace.status === "reached" ? (
            <span className="text-sm font-semibold text-solved">Goal reached 🎉</span>
          ) : pace.projectedFinish ? (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold tracking-tight tabular-nums">
                {fmtDate(pace.projectedFinish)}
              </span>
              {early !== null && (
                <span className={cn("text-xs", early > 0 ? "text-hard" : "text-solved")}>
                  {early === 0
                    ? "right on target"
                    : `${Math.abs(early)} days ${early > 0 ? "after" : "before"} target`}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Solve a problem to get a projection
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

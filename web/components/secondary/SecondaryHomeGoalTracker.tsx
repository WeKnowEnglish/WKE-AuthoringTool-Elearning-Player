"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { dailyMasteryGoalProgressFromSession } from "@/lib/secondary/secondary-daily-mastery-goal";
import {
  resolveSecondaryNextActivityKey,
  SECONDARY_ACTIVITY_HREF,
  SECONDARY_STUDY_ACTIVITY_ORDER,
} from "@/lib/secondary/secondary-study-activity";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

const ACTIVITY_LABELS: Record<SecondaryTodayActivityKey, string> = {
  match: "Match",
  cloze: "Cloze",
  spelling: "Spelling",
  sentence: "Sentence",
};

function GoalRing({
  mastered,
  goal,
  reached,
}: {
  mastered: number;
  goal: number;
  reached: boolean;
}) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(1, mastered / goal) : 0;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15, 118, 110, 0.14)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={reached ? "var(--sec-success)" : "var(--sec-accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-black tabular-nums text-[var(--sec-ink)]">
          {mastered}
          <span className="text-sm font-bold text-[var(--sec-muted)]">/{goal || 10}</span>
        </span>
      </div>
    </div>
  );
}

/** Portal Home — compact today's goal + continue. */
export function SecondaryHomeGoalTracker() {
  const { todaySession, completion, hydrated, sessionRevision } = useSecondaryTodaySession();
  const studentId = resolveSecondaryStudentId();
  const dateKey = todaySession?.dateKey ?? "";
  const sessionWordIds = todaySession?.allWordItemIds ?? [];

  const studyCtx = useMemo(
    () => ({
      sessionWordIds,
      dateKey,
      studentId,
      completion,
    }),
    [sessionWordIds, dateKey, studentId, completion, sessionRevision],
  );

  const goalProgress = useMemo(() => {
    if (!todaySession) {
      return { masteredCount: 0, goal: 10, remainingCount: 10, goalReached: false };
    }
    return dailyMasteryGoalProgressFromSession(todaySession, getSecondaryWordDisplaySnapshot);
  }, [todaySession, sessionRevision]);

  const nextActivityKey = useMemo(
    () => resolveSecondaryNextActivityKey(studyCtx),
    [studyCtx],
  );

  const continueHref = nextActivityKey
    ? SECONDARY_ACTIVITY_HREF[nextActivityKey]
    : "/secondary/learn";
  const continueLabel = nextActivityKey
    ? ACTIVITY_LABELS[nextActivityKey]
    : "Learn";

  return (
    <section
      aria-labelledby="secondary-home-goal-heading"
      className="relative h-full overflow-hidden rounded-2xl border border-[var(--sec-border)] bg-[var(--sec-card)]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,_#f7fbfa_0%,_#eef7f5_55%,_#f3f6fa_100%)]"
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--sec-muted)]">
            Today&apos;s goal
          </p>
          <h2
            id="secondary-home-goal-heading"
            className="mt-1 text-lg font-extrabold tracking-tight text-[var(--sec-ink)]"
          >
            {goalProgress.goalReached ? "Goal complete" : "Master 10 words"}
          </h2>

          <ol className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Today's activities">
            {SECONDARY_STUDY_ACTIVITY_ORDER.map((key) => {
              const done = Boolean(completion[key]?.completed);
              const isNext = nextActivityKey === key;
              return (
                <li
                  key={key}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    done
                      ? "bg-emerald-100 text-emerald-800"
                      : isNext
                        ? "bg-[var(--sec-accent-soft)] text-[var(--sec-accent)]"
                        : "bg-white/80 text-[var(--sec-muted)]"
                  }`}
                >
                  {ACTIVITY_LABELS[key]}
                </li>
              );
            })}
          </ol>

          <Link
            href={continueHref}
            className="group mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--sec-accent)] px-3.5 py-2 text-sm font-extrabold text-white transition hover:bg-[var(--sec-accent-hover)] active:scale-[0.98]"
          >
            Continue
            <span className="font-bold text-white/85">{continueLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        {!hydrated ? (
          <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded-full bg-[var(--sec-panel-muted)]" />
        ) : (
          <GoalRing
            mastered={goalProgress.masteredCount}
            goal={goalProgress.goal}
            reached={goalProgress.goalReached}
          />
        )}
      </div>
    </section>
  );
}

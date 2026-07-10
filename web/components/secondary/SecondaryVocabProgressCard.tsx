"use client";

import { SLOW_REPLACE_MASTERED_THRESHOLD } from "@/lib/secondary/secondary-session-slow-replace";
import { getSecondaryHomeGoalIconUrl } from "@/lib/secondary/secondary-activity-icons";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { SecondaryHomeIcon } from "@/components/secondary/SecondaryHomeIcon";

type Props = {
  masteredCount: number;
  goal: number;
};

function encouragementMessage(masteredCount: number, goal: number): string {
  if (goal <= 0) return "Check back when today's words are ready.";
  if (masteredCount <= 0) return "Master 10 words today to hit your goal.";
  if (masteredCount >= goal) {
    return "Daily goal reached — great work. Keep practicing or come back tomorrow.";
  }
  const remaining = goal - masteredCount;
  if (masteredCount >= goal / 2) {
    return `More than halfway — ${remaining} more to go.`;
  }
  return "Good start — keep building toward today's goal.";
}

export function SecondaryVocabProgressCard({ masteredCount, goal }: Props) {
  const remainingCount = Math.max(0, goal - masteredCount);
  const percent = goal > 0 ? Math.round((masteredCount / goal) * 100) : 0;
  const fillWidth = goal > 0 ? Math.min(100, (masteredCount / goal) * 100) : 0;
  const goalReached = masteredCount >= goal && goal > 0;

  return (
    <div className="rounded-xl border-2 border-kid-ink bg-white p-5">
      <div className="flex items-center gap-3">
        <SecondaryHomeIcon src={getSecondaryHomeGoalIconUrl()} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className={secondaryUi.cardTitle}>Daily mastery goal</p>
            <p className={secondaryUi.stat}>
              {masteredCount}/{goal}
            </p>
          </div>
        </div>
      </div>

      <div
        className="mt-4 h-5 overflow-hidden rounded-full border-2 border-kid-ink bg-kid-panel"
        role="meter"
        aria-label="Daily vocabulary mastery goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={masteredCount}
        title={`When ${SLOW_REPLACE_MASTERED_THRESHOLD} or more focus words are mastered, the oldest swaps out for a new word from the bank.`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            goalReached ? "bg-emerald-500" : percent >= 50 ? "bg-emerald-400" : "bg-kid-accent"
          }`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>

      <p className={`mt-3 ${secondaryUi.caption}`}>
        {goalReached
          ? `${masteredCount} words mastered today — goal complete`
          : `${masteredCount} mastered today · ${remainingCount} to go`}
      </p>
      <p className={`mt-2 ${secondaryUi.body} font-extrabold text-kid-ink`}>
        {encouragementMessage(masteredCount, goal)}
      </p>
    </div>
  );
}

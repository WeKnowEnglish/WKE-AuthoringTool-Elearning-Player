"use client";

import { clsx } from "clsx";

type Props = {
  /** Fill level 0..1 */
  energyFill: number;
  /** Consecutive correct answers; resets to 0 after a wrong answer. */
  streak: number;
  className?: string;
};

/** Energy bar + streak multiplier for activity-library quizzes (no question-count coupling). */
export function KidQuizActivityHud({ energyFill, streak, className }: Props) {
  const pct = Math.min(100, Math.max(0, energyFill * 100));
  const multiplier = Math.max(1, streak);

  return (
    <div className={clsx("flex min-w-[12rem] flex-col gap-2 sm:min-w-[14rem]", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-kid-ink/80">
        <span>Energy</span>
        <span className="tabular-nums" aria-live="polite">
          ×{multiplier}
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full border-2 border-kid-ink bg-kid-panel"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Energy toward bonus reward"
      >
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-xs font-semibold text-kid-ink/70">
        {streak > 0 ? `${streak} correct in a row` : "Build a streak!"}
      </p>
    </div>
  );
}

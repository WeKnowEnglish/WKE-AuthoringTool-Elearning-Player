"use client";

import { clsx } from "clsx";
import { xpProgressInLevel } from "@/lib/progress/leveling";

type Props = {
  experience: number;
  compact?: boolean;
  className?: string;
};

export function PlayerLevelBar({ experience, compact = false, className }: Props) {
  const { level, current, required, percent } = xpProgressInLevel(experience);

  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col gap-0.5",
        compact ? "max-w-[9rem] sm:max-w-[11rem]" : "w-full max-w-md",
        className,
      )}
      role="group"
      aria-label={`Level ${level}, ${current} of ${required} XP to next level`}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-kid-ink">
        <span className="rounded-md border-2 border-kid-ink bg-sky-100 px-1.5 py-0.5 tabular-nums">
          Lv {level}
        </span>
        <span className="tabular-nums text-kid-ink/85">
          {current}/{required} XP
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full border-2 border-kid-ink bg-white/60 sm:h-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required}
        aria-valuenow={current}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

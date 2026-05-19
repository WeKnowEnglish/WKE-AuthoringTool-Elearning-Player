"use client";

import { clsx } from "clsx";
import { xpProgressInLevel } from "@/lib/progress/leveling";

type Props = {
  experience: number;
  compact?: boolean;
  /** Hero-style bar for home and other focal layouts. */
  prominent?: boolean;
  className?: string;
};

export function PlayerLevelBar({
  experience,
  compact = false,
  prominent = false,
  className,
}: Props) {
  const { level, current, required, percent } = xpProgressInLevel(experience);

  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col",
        prominent ?
          "gap-2 rounded-2xl border-4 border-kid-ink bg-kid-panel p-4 shadow-[4px_4px_0_#1a1a1a]"
        : compact ?
          "max-w-[9rem] gap-0.5 sm:max-w-[11rem]"
        : "w-full max-w-md gap-0.5",
        className,
      )}
      role="group"
      aria-label={`Level ${level}, ${current} of ${required} XP to next level`}
    >
      {prominent ?
        <p className="text-xs font-extrabold uppercase tracking-widest text-kid-ink/75">Your level</p>
      : null}
      <div
        className={clsx(
          "flex items-center justify-between gap-2 text-kid-ink",
          prominent ? "text-lg font-black sm:text-xl" : "text-xs font-extrabold",
        )}
      >
        <span
          className={clsx(
            "rounded-md border-kid-ink bg-sky-100 tabular-nums",
            prominent ?
              "rounded-xl border-4 px-3 py-1 text-2xl sm:text-3xl"
            : "border-2 px-1.5 py-0.5",
          )}
        >
          Lv {level}
        </span>
        <span className={clsx("tabular-nums", prominent ? "text-kid-ink" : "text-kid-ink/85")}>
          {current}/{required} XP
        </span>
      </div>
      <div
        className={clsx(
          "overflow-hidden rounded-full border-kid-ink bg-white/60",
          prominent ? "h-5 border-4 sm:h-6" : "h-2.5 border-2 sm:h-3",
        )}
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

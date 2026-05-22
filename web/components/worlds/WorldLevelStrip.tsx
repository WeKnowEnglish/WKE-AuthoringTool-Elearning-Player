"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import type { WorldDef } from "@/lib/worlds/types";

type Props = {
  world: WorldDef;
  /**
   * Level indices (1–10) with exploration progress.
   * Omit until client hydration so SSR and first paint match (all pills inactive).
   */
  levelsWithProgress?: number[];
  className?: string;
};

export function WorldLevelStrip({ world, levelsWithProgress, className }: Props) {
  const touchedIndices = useMemo(
    () => new Set(levelsWithProgress ?? []),
    [levelsWithProgress],
  );

  return (
    <ul
      className={clsx(
        "flex flex-wrap justify-center gap-1.5",
        className,
      )}
      aria-label={`${world.name} levels`}
    >
      {world.levels.map((level) => {
        const touched =
          levelsWithProgress !== undefined && touchedIndices.has(level.index);
        return (
          <li key={level.id}>
            <span
              className={clsx(
                "flex h-8 min-w-[2rem] items-center justify-center rounded-lg border-2 px-1.5 text-xs font-extrabold tabular-nums",
                touched ?
                  "border-kid-ink bg-emerald-200 text-kid-ink"
                : "border-kid-ink/40 bg-white/80 text-kid-ink/55",
              )}
              title={`${level.title}: ${level.subtitle}`}
            >
              {level.index}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

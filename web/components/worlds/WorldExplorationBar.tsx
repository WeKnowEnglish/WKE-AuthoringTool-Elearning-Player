"use client";

import { clsx } from "clsx";
import type { WorldExplorationSummary } from "@/lib/worlds/exploration";

type Props = {
  worldName: string;
  summary: WorldExplorationSummary | null;
  prominent?: boolean;
  className?: string;
};

export function WorldExplorationBar({
  worldName,
  summary,
  prominent = true,
  className,
}: Props) {
  const touched = summary?.touchedCount ?? 0;
  const total = summary?.totalCount ?? 0;
  const percent = summary?.percent ?? 0;

  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col",
        prominent ?
          "gap-2 rounded-2xl border-4 border-kid-ink bg-kid-panel p-4 shadow-[4px_4px_0_#1a1a1a]"
        : "w-full max-w-md gap-0.5",
        className,
      )}
      role="group"
      aria-label={
        summary ?
          `Exploring ${worldName}, ${touched} of ${total} activities tried, ${percent} percent`
        : `Exploring ${worldName}, loading progress`
      }
    >
      {prominent ?
        <p className="text-xs font-extrabold uppercase tracking-widest text-kid-ink/75">
          Exploring {worldName}
        </p>
      : null}
      <div
        className={clsx(
          "flex items-center justify-between gap-2 text-kid-ink",
          prominent ? "text-base font-black sm:text-lg" : "text-xs font-extrabold",
        )}
      >
        <span className={clsx("tabular-nums", prominent ? "text-kid-ink" : "text-kid-ink/85")}>
          {touched}/{total} explored
        </span>
        <span
          className={clsx(
            "rounded-md border-kid-ink bg-emerald-100 tabular-nums",
            prominent ?
              "rounded-xl border-4 px-3 py-0.5 text-lg sm:text-xl"
            : "border-2 px-1.5 py-0.5",
          )}
        >
          {percent}%
        </span>
      </div>
      <div
        className={clsx(
          "overflow-hidden rounded-full border-kid-ink bg-white/60",
          prominent ? "h-5 border-4 sm:h-6" : "h-2.5 border-2 sm:h-3",
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

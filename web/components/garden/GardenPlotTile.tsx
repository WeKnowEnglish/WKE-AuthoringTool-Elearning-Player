"use client";

import { clsx } from "clsx";
import {
  formatGrowRemaining,
  isPlotTreated,
  plotHasWeed,
  remainingGrowMs,
  resolveGrowthStage,
  WATERING_CAN_GROW_MULTIPLIER,
  type CropGrowthStage,
  type FarmPlot,
  type GardenSeedTier,
} from "@/lib/garden";

const STAGE_EMOJI: Record<CropGrowthStage, string> = {
  empty: "",
  sprout: "🌱",
  growing: "🌿",
  ready: "🌾",
};

type Props = {
  plot: FarmPlot;
  now: number;
  selected?: boolean;
  waterMode?: boolean;
  fertilizeMode?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function GardenPlotTile({
  plot,
  now,
  selected,
  waterMode,
  fertilizeMode,
  disabled,
  onSelect,
}: Props) {
  const tier: GardenSeedTier = plot.seedTier ?? "common";
  const stage = resolveGrowthStage(plot, now, tier);
  const remaining = remainingGrowMs(plot, tier, now);
  const emoji = STAGE_EMOJI[stage];
  const treated = isPlotTreated(plot);
  const isWatered = plot.growMultiplier >= WATERING_CAN_GROW_MULTIPLIER;
  const isFertilized = plot.fertilizedAt != null;
  const hasWeed = plotHasWeed(plot);
  const canWater =
    Boolean(waterMode) && (stage === "sprout" || stage === "growing") && !treated;
  const canFertilize =
    Boolean(fertilizeMode) && (stage === "sprout" || stage === "growing") && !treated;

  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(
        "relative flex aspect-square w-full flex-col items-center justify-center rounded-lg border-4 border-kid-ink/40",
        "transition-transform [touch-action:manipulation]",
        stage === "empty" ? "bg-[#8b5a2b]/30" : "bg-[#6b8e23]/25",
        stage === "ready" && "border-emerald-700 bg-emerald-100/60 shadow-[0_0_12px_rgba(16,185,129,0.45)]",
        stage === "ready" && hasWeed && "border-lime-700 bg-lime-100/60 shadow-[0_0_12px_rgba(132,204,22,0.45)]",
        canWater && "border-sky-600 bg-sky-100/50 ring-2 ring-sky-400/60",
        canFertilize && "border-amber-600 bg-amber-100/50 ring-2 ring-amber-400/60",
        isWatered && stage !== "empty" && stage !== "ready" && "border-sky-500/70",
        isFertilized && stage === "ready" && "border-amber-600/80",
        selected && "ring-4 ring-[#0f4ecf] ring-offset-2",
        !disabled && "hover:scale-[1.03] active:scale-95",
        disabled && "cursor-default opacity-80",
      )}
      aria-label={plotAriaLabel(stage, remaining, isWatered, isFertilized, hasWeed, canWater, canFertilize)}
      onClick={onSelect}
    >
      {stage === "empty" ?
        <span className="text-2xl opacity-40 sm:text-3xl" aria-hidden>
          🟫
        </span>
      : <>
          <span
            className={clsx(
              "text-3xl sm:text-4xl",
              stage === "ready" && "animate-pulse",
            )}
            aria-hidden
          >
            {emoji}
          </span>
          {stage !== "ready" ?
            <span className="mt-0.5 text-[0.65rem] font-bold text-kid-ink/80 sm:text-xs">
              {isWatered ? "💧 " : ""}
              {formatGrowRemaining(remaining)}
            </span>
          : <span className="mt-0.5 text-[0.65rem] font-extrabold uppercase text-emerald-800 sm:text-xs">
              {hasWeed ? "🌿 " : isFertilized ? "🧪 " : ""}
              {hasWeed ? "Weed!" : "Tap!"}
            </span>
          }
        </>
      }
    </button>
  );
}

function plotAriaLabel(
  stage: CropGrowthStage,
  remainingMs: number,
  isWatered: boolean,
  isFertilized: boolean,
  hasWeed: boolean,
  canWater: boolean,
  canFertilize: boolean,
): string {
  if (stage === "empty") return "Empty plot. Tap to plant a seed.";
  if (stage === "ready") {
    if (hasWeed) return "Crop ready but blocked by a weed. Tap to clear.";
    return isFertilized ?
        "Fertilized crop ready. Tap to harvest a letter."
      : "Crop ready. Tap to harvest a letter.";
  }
  if (canWater) {
    return `Growing crop. Tap to water and speed up growth. ${formatGrowRemaining(remainingMs)} left.`;
  }
  if (canFertilize) {
    return `Growing crop. Tap to fertilize and ripen instantly. ${formatGrowRemaining(remainingMs)} left.`;
  }
  if (isWatered) return `Watered crop growing faster. ${formatGrowRemaining(remainingMs)} remaining.`;
  return `Growing crop, ${formatGrowRemaining(remainingMs)} remaining.`;
}

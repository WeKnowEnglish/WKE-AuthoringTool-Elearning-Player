"use client";

import { clsx } from "clsx";
import { TopDownStackedIndividualTile } from "@/components/topdown/TopDownIndividualTile";
import {
  GARDEN_MAP_LAYOUT,
  gardenLockedGrassAriaLabel,
} from "@/lib/garden/garden-map-layout";
import { formatPlotPurchaseCost } from "@/lib/garden/plot-unlock";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";

type Props = {
  cost: number;
  canAfford: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPurchase: () => void;
};

export function GardenLockedGrassTile({
  cost,
  canAfford,
  selected,
  disabled,
  onPurchase,
}: Props) {
  const tile = getIndividualTile("grass_1");

  if (!tile) {
    return (
      <div
        className="bg-red-900/40"
        style={{
          width: GARDEN_MAP_LAYOUT.logicalTilePx,
          height: GARDEN_MAP_LAYOUT.logicalTilePx,
        }}
        title="Missing tile: grass_1"
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(
        "relative overflow-visible transition-transform [touch-action:manipulation]",
        selected && "ring-4 ring-[#0f4ecf] ring-offset-2",
        canAfford && !disabled && "hover:scale-[1.03] active:scale-95",
        disabled && "cursor-default opacity-90",
      )}
      style={{
        width: GARDEN_MAP_LAYOUT.logicalTilePx,
        height: GARDEN_MAP_LAYOUT.logicalTilePx,
      }}
      aria-label={gardenLockedGrassAriaLabel(cost, canAfford)}
      onClick={onPurchase}
    >
      <TopDownStackedIndividualTile
        tile={tile}
        footprint={tile.footprint}
        layout={GARDEN_MAP_LAYOUT}
      />
      <span
        className={clsx(
          "pointer-events-none absolute inset-x-0 top-[38%] mx-auto w-fit rounded-md border-2 px-1.5 py-0.5 text-[0.55rem] font-extrabold tabular-nums sm:text-[0.6rem]",
          canAfford ?
            "border-amber-700 bg-amber-100 text-amber-950 shadow-md"
          : "border-kid-ink/40 bg-white/75 text-kid-ink/60",
        )}
      >
        {formatPlotPurchaseCost(cost)}
      </span>
    </button>
  );
}

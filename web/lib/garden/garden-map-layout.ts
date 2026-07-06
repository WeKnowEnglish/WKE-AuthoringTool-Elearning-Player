import { WATERING_CAN_GROW_MULTIPLIER } from "@/lib/garden/defaults";
import {
  formatGrowRemaining,
  remainingGrowMs,
  resolveGrowthStage,
} from "@/lib/garden/growth";
import { isPlotTreated } from "@/lib/garden/fertilizer";
import { isPlotUnlocked, nextGrassPlotCost } from "@/lib/garden/plot-unlock";
import { plotHasWeedMonster } from "@/lib/garden/weed-monsters";
import type { CropGrowthStage, FarmPlot, GardenSeedTier, GardenSnapshotV1 } from "@/lib/garden/types";
import { PILOT_MAP_LAYOUT } from "@/lib/topdown/preview-individual-map";
import {
  resolvePlotVisual,
  type PlotBaseTileId,
  type PlotVisual,
} from "@/lib/topdown/plot-to-individual-tile";
import type { TileLayoutPreset } from "@/lib/topdown/stacked-individual-layout";
import {
  columnStridePx,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";

export const GARDEN_MAP_LAYOUT: TileLayoutPreset = PILOT_MAP_LAYOUT;
export const GARDEN_GRID_BG = "#52c4ef";
export const GARDEN_LABEL_OFFSET_Y_PX = -16;
export const GARDEN_GRID_PAD_X_PX = 4;
export const GARDEN_GRID_PAD_TOP_PX = 4;
/** Clear space above the blue panel (outside the water frame). */
export const GARDEN_GRID_OUTER_TOP_PAD_PX = 15;
/** Extra blue panel padding below the bottom row so 3D tile lips stay inside the frame. */
export const GARDEN_GRID_PAD_BOTTOM_PX = 22;
export const GARDEN_DESKTOP_BREAKPOINT_PX = 768;
export const GARDEN_GRID_SCALE_INSET_PX = 0;
/** Slight desktop scale boost — square viewport usually has side slack. */
export const GARDEN_GRID_SCALE_BOOST = 1.1236;
/** Nudge the scaled grid down within the square viewport (desktop). */
export const GARDEN_GRID_VERTICAL_OFFSET_PX = 10;

export type GardenCellKind = "plot" | "locked_grass";

export type GardenPlotCellVisual = {
  kind: "plot";
  row: number;
  col: number;
  tileId: PlotBaseTileId;
  plot: FarmPlot;
  plotVisual: PlotVisual;
};

export type GardenLockedGrassCellVisual = {
  kind: "locked_grass";
  row: number;
  col: number;
  tileId: "grass_1";
  purchaseCost: number;
  canAfford?: boolean;
};

export type GardenCellVisual = GardenPlotCellVisual | GardenLockedGrassCellVisual;

export type GardenPlotInteractionState = {
  stage: CropGrowthStage;
  canWater: boolean;
  canFertilize: boolean;
  isReady: boolean;
  hasWeed: boolean;
  isWatered: boolean;
  isFertilized: boolean;
  selected: boolean;
};

export type GardenPlotOverlayVariant = "timer" | "ready" | "weed";

function plotAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
): FarmPlot | undefined {
  return snapshot.plots.find((p) => p.row === row && p.col === col);
}

export function gardenGridStyle(rows: number, cols: number) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${columnStridePx(GARDEN_MAP_LAYOUT)}px)`,
    gridAutoRows: `${rowStridePx(GARDEN_MAP_LAYOUT)}px`,
    gap: 0,
  } as const;
}

/** Unscaled pixel frame for the blue grid panel (tiles + label row + padding). */
export function gardenGridNaturalSize(rows: number, cols: number) {
  const colStride = columnStridePx(GARDEN_MAP_LAYOUT);
  const rowStride = rowStridePx(GARDEN_MAP_LAYOUT);
  return {
    width: GARDEN_GRID_PAD_X_PX * 2 + cols * colStride,
    height:
      GARDEN_GRID_OUTER_TOP_PAD_PX +
      GARDEN_GRID_PAD_TOP_PX +
      rows * rowStride +
      rowStride +
      GARDEN_GRID_PAD_BOTTOM_PX,
  };
}

export function resolveGardenCellVisual(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now: number,
  opts?: { gold?: number },
): GardenCellVisual | null {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return null;

  if (!isPlotUnlocked(snapshot, row, col)) {
    const purchaseCost = nextGrassPlotCost(snapshot);
    if (purchaseCost == null) return null;

    return {
      kind: "locked_grass",
      row,
      col,
      tileId: "grass_1",
      purchaseCost,
      canAfford: opts?.gold != null ? opts.gold >= purchaseCost : undefined,
    };
  }

  const plotVisual = resolvePlotVisual({ plot, now });
  return {
    kind: "plot",
    row,
    col,
    tileId: plotVisual.tileId,
    plot,
    plotVisual,
  };
}

export function gardenPlotInteractionState(
  plot: FarmPlot,
  now: number,
  opts: {
    waterMode?: boolean;
    fertilizeMode?: boolean;
    selected?: boolean;
    tier?: GardenSeedTier;
  } = {},
): GardenPlotInteractionState {
  const tier = opts.tier ?? plot.seedTier ?? "common";
  const stage = resolveGrowthStage(plot, now, tier);
  const treated = isPlotTreated(plot);
  const isWatered = plot.growMultiplier >= WATERING_CAN_GROW_MULTIPLIER;
  const isFertilized = plot.fertilizedAt != null;
  const hasWeed = plotHasWeedMonster(plot);
  const canWater =
    Boolean(opts.waterMode) &&
    (stage === "sprout" || stage === "growing") &&
    !treated;
  const canFertilize =
    Boolean(opts.fertilizeMode) &&
    (stage === "sprout" || stage === "growing") &&
    !treated;

  return {
    stage,
    canWater,
    canFertilize,
    isReady: stage === "ready",
    hasWeed,
    isWatered,
    isFertilized,
    selected: Boolean(opts.selected),
  };
}

export function gardenPlotOverlayText(
  plot: FarmPlot,
  now: number,
  opts: {
    waterMode?: boolean;
    fertilizeMode?: boolean;
    tier?: GardenSeedTier;
  } = {},
): string | null {
  const tier = opts.tier ?? plot.seedTier ?? "common";
  const stage = resolveGrowthStage(plot, now, tier);
  const hasWeed = plotHasWeedMonster(plot);
  const isFertilized = plot.fertilizedAt != null;
  const isWatered = plot.growMultiplier >= WATERING_CAN_GROW_MULTIPLIER;

  if (stage === "empty") {
    if (hasWeed) return "Fight!";
    return null;
  }

  if (stage === "ready") {
    if (isFertilized) return "🧪 Tap!";
    return "Tap!";
  }

  const remaining = remainingGrowMs(plot, tier, now);
  return isWatered ? `💧 ${formatGrowRemaining(remaining)}` : formatGrowRemaining(remaining);
}

export function gardenPlotOverlayVariant(
  plot: FarmPlot,
  now: number,
  tier?: GardenSeedTier,
): GardenPlotOverlayVariant {
  const resolvedTier = tier ?? plot.seedTier ?? "common";
  const stage = resolveGrowthStage(plot, now, resolvedTier);
  if (stage === "empty" && plotHasWeedMonster(plot)) return "weed";
  if (stage === "ready") return "ready";
  return "timer";
}

export function gardenPlotAriaLabel(
  plot: FarmPlot,
  now: number,
  interaction: GardenPlotInteractionState,
  tier?: GardenSeedTier,
): string {
  const resolvedTier = tier ?? plot.seedTier ?? "common";
  const remaining = remainingGrowMs(plot, resolvedTier, now);

  if (interaction.stage === "empty") {
    if (interaction.hasWeed) {
      return "Empty plot blocked by a weed monster. Tap to fight.";
    }
    return "Empty plot. Tap to plant a seed.";
  }
  if (interaction.stage === "ready") {
    return interaction.isFertilized ?
        "Fertilized crop ready. Tap to harvest a letter."
      : "Crop ready. Tap to harvest a letter.";
  }
  if (interaction.canWater) {
    return `Growing crop. Tap to water and speed up growth. ${formatGrowRemaining(remaining)} left.`;
  }
  if (interaction.canFertilize) {
    return `Growing crop. Tap to fertilize and ripen instantly. ${formatGrowRemaining(remaining)} left.`;
  }
  if (interaction.isWatered) {
    return `Watered crop growing faster. ${formatGrowRemaining(remaining)} remaining.`;
  }
  return `Growing crop, ${formatGrowRemaining(remaining)} remaining.`;
}

export function gardenLockedGrassAriaLabel(cost: number, canAfford: boolean): string {
  if (canAfford) {
    return `Locked grass plot. Costs ${cost} gold. Tap to purchase.`;
  }
  return `Locked grass plot. Costs ${cost} gold. Not enough gold.`;
}

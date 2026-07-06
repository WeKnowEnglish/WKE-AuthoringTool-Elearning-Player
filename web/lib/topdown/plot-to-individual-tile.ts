import {
  growDurationMs,
  resolveGrowthStage,
  WATERING_CAN_GROW_MULTIPLIER,
  type CropGrowthStage,
  type FarmPlot,
  type GardenSeedTier,
} from "@/lib/garden";
import {
  letterFruitStageForGrowth,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";
import type { MockPlotState } from "@/lib/topdown/preview-mock-data";



/** Base plot tile — letter fruit stages render as overlays on tilled soil. */

export type PlotBaseTileId = "dirt_tilled";



export const PLOT_TILE_THRESHOLDS = {

  /** ~7s seed-mound window on a 60s common crop */

  PLANTED_BAND_MAX: 0.12,

  /** Tall sprout during late growing, before harvest-ready */

  TALL_SPROUT_MIN: 0.85,

} as const;



export type PlotTileLookupInput = {

  plot: FarmPlot;

  now: number;

  tier?: GardenSeedTier;

};



export type PlotVisualOverlays = {

  hasWeed: boolean;

  isFertilized: boolean;

  /** Reserved — no watered tile art wired yet */

  isWatered: boolean;

};



export type PlotVisual = {
  tileId: PlotBaseTileId;
  stage: CropGrowthStage;
  /** Elapsed ratio 0..1 (0 when empty) */
  progress: number;
  overlays: PlotVisualOverlays;
  fruitStage: LetterFruitStageId | null;
  fruitSlug: LetterFruitSlug | null;
};



function clamp01(value: number): number {

  if (value <= 0) return 0;

  if (value >= 1) return 1;

  return value;

}



function plotTier(plot: FarmPlot, tier?: GardenSeedTier): GardenSeedTier {

  return tier ?? plot.seedTier ?? "common";

}



function plotProgress(

  plot: FarmPlot,

  now: number,

  tier: GardenSeedTier,

  stage: CropGrowthStage,

): number {

  if (stage === "empty" || plot.plantedAt == null) return 0;

  const duration = growDurationMs(tier, plot.growMultiplier);

  if (duration <= 0) return 0;

  return clamp01((now - plot.plantedAt) / duration);

}



/**

 * Maps live garden plot state to the base soil tile.

 * Growth stages use letter-fruit overlays on tilled soil — not legacy lifecycle tiles.

 */

export function plotToIndividualTileId(input: PlotTileLookupInput): PlotBaseTileId {

  const stage = resolveGrowthStage(input.plot, input.now, plotTier(input.plot, input.tier));

  if (stage === "empty") return "dirt_tilled";

  return "dirt_tilled";

}



export function resolvePlotVisual(input: PlotTileLookupInput): PlotVisual {
  const tier = plotTier(input.plot, input.tier);
  const stage = resolveGrowthStage(input.plot, input.now, tier);
  const progress = plotProgress(input.plot, input.now, tier, stage);
  const fruitStage =
    stage === "empty" ? null : letterFruitStageForGrowth(stage, progress);
  const fruitSlug =
    stage === "empty" || !input.plot.fruitSlug ? null : input.plot.fruitSlug;

  return {
    tileId: plotToIndividualTileId(input),
    stage,
    progress,
    overlays: {
      hasWeed: Boolean(input.plot.weedMonster),
      isFertilized: input.plot.fertilizedAt != null,
      isWatered: input.plot.growMultiplier >= WATERING_CAN_GROW_MULTIPLIER,
    },
    fruitStage,
    fruitSlug,
  };
}



/** Pilot mock grid — tilled base for all plot states. */

export function mockPlotStateToIndividualTileId(_state: MockPlotState): PlotBaseTileId {

  return "dirt_tilled";

}



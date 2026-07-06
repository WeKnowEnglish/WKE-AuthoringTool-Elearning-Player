import {
  letterFruitAssetKey,
  parseLetterFruitAssetKey,
  type LetterAFruitAssetKey,
  type LetterFruitAssetKey,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";
import type { LetterFruitPlotPreset } from "@/lib/topdown/plot-layer-types";

/** Hand-tuned plot-layer presets — updated via apply-letter-fruit-plot-picks. */
export const LETTER_A_PLOT_PRESETS: Record<LetterAFruitAssetKey, LetterFruitPlotPreset> = {
  letter_a_seed: {
    baseTileId: "dirt_tilled",
    fruitStage: "seed",
    layer: { scale: 0.091, offsetX: 0, offsetY: 0, anchor: "center" },
  },
  letter_a_sprout: {
    baseTileId: "dirt_tilled",
    fruitStage: "sprout",
    layer: { scale: 0.108, offsetX: 0, offsetY: -6, anchor: "center" },
  },
  letter_a_young: {
    baseTileId: "dirt_tilled",
    fruitStage: "young",
    layer: { scale: 0.108, offsetX: -1, offsetY: -27, anchor: "bottom-center" },
  },
  letter_a_growing: {
    baseTileId: "dirt_tilled",
    fruitStage: "growing",
    layer: { scale: 0.111, offsetX: -1.5, offsetY: -26.25, anchor: "bottom-center" },
  },
  letter_a_ripe: {
    baseTileId: "dirt_tilled",
    fruitStage: "ripe",
    layer: { scale: 0.103, offsetX: -0.25, offsetY: -29.75, anchor: "bottom-center" },
  },
};

function templateForStage(stage: LetterFruitStageId): LetterFruitPlotPreset {
  return LETTER_A_PLOT_PRESETS[`letter_a_${stage}` as LetterAFruitAssetKey];
}

export function getLetterFruitPlotPreset(
  assetKey: LetterFruitAssetKey,
): LetterFruitPlotPreset {
  if (assetKey in LETTER_A_PLOT_PRESETS) {
    return LETTER_A_PLOT_PRESETS[assetKey as LetterAFruitAssetKey];
  }
  const { stage } = parseLetterFruitAssetKey(assetKey);
  return templateForStage(stage);
}

export function letterFruitPlotPresetForStage(
  slug: LetterFruitSlug,
  stage: LetterFruitStageId,
): LetterFruitPlotPreset {
  return getLetterFruitPlotPreset(letterFruitAssetKey(slug, stage));
}

import { describe, expect, it } from "vitest";
import { letterFruitPlotPresetForStage } from "@/lib/topdown/letter-fruit-plot-presets";
import { listLetterAFruitAssetIds, type LetterFruitStageId } from "@/lib/topdown/letter-fruit-atlas";
import {
  normalizeLetterFruitPlotPicksPayload,
  patchLetterFruitPlotPresets,
  type LetterFruitPlotPicksPayload,
} from "@/lib/topdown/letter-fruit-plot-picks-sync";

const FIXTURE_SOURCE = `import type { LetterAFruitAssetKey, LetterFruitStageId } from "@/lib/topdown/letter-fruit-atlas";
import type { LetterFruitPlotPreset } from "@/lib/topdown/plot-layer-types";

/** Hand-tuned plot-layer presets — updated via apply-letter-fruit-plot-picks. */
export const LETTER_A_PLOT_PRESETS: Record<LetterAFruitAssetKey, LetterFruitPlotPreset> = {
  letter_a_seed: {
    baseTileId: "dirt_tilled",
    fruitStage: "seed",
    layer: { scale: 0.1, offsetX: 0, offsetY: 0, anchor: "bottom-center" },
  },
};

export function getLetterFruitPlotPreset() {}`;

describe("letter-fruit-plot-picks-sync", () => {
  it("requires all five letter A plot stages", () => {
    const assetKey = listLetterAFruitAssetIds()[0];
    const payload: LetterFruitPlotPicksPayload = {
      presets: [{ assetKey, preset: letterFruitPlotPresetForStage("a", "seed") }],
    };
    expect(() => normalizeLetterFruitPlotPicksPayload(payload)).toThrow(
      /Missing letter fruit plot picks/,
    );
  });

  it("rejects fruitStage mismatch", () => {
    const payload: LetterFruitPlotPicksPayload = {
      presets: listLetterAFruitAssetIds().map((assetKey) => ({
        assetKey,
        preset: {
          ...letterFruitPlotPresetForStage("a", "seed"),
          fruitStage: "ripe" as const,
        },
      })),
    };
    expect(() => normalizeLetterFruitPlotPicksPayload(payload)).toThrow(/fruitStage mismatch/);
  });

  it("patches the plot preset source block", () => {
    const picks = listLetterAFruitAssetIds().map((assetKey) => {
      const stage = assetKey.replace("letter_a_", "") as LetterFruitStageId;
      const preset = letterFruitPlotPresetForStage("a", stage);
      return {
        assetKey,
        preset: {
          ...preset,
          layer: { ...preset.layer, scale: preset.layer.scale + 0.01 },
        },
      };
    });

    const next = patchLetterFruitPlotPresets(FIXTURE_SOURCE, picks);
    expect(next).toContain("letter_a_ripe: {");
    expect(next).toContain("layer: { scale: 0.113,");
    expect(next).not.toContain("layer: { scale: 0.1,");
  });
});

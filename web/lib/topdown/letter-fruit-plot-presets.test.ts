import { describe, expect, it } from "vitest";
import {
  LETTER_A_FRUIT_ATLAS,
  listLetterAFruitAssetIds,
} from "@/lib/topdown/letter-fruit-atlas";
import {
  getLetterFruitPlotPreset,
  letterFruitPlotPresetForStage,
  LETTER_A_PLOT_PRESETS,
} from "@/lib/topdown/letter-fruit-plot-presets";
import { getIndividualTile } from "@/lib/topdown/individual-tiles";
import { computePlotFruitPlacement } from "@/lib/topdown/plot-layer-placement";

describe("letter-fruit-plot-presets", () => {
  it("defines all five Letter A stages", () => {
    const ids = listLetterAFruitAssetIds();
    expect(Object.keys(LETTER_A_PLOT_PRESETS)).toEqual(expect.arrayContaining(ids));
    expect(Object.keys(LETTER_A_PLOT_PRESETS)).toHaveLength(5);
  });

  it("uses valid base tiles", () => {
    for (const preset of Object.values(LETTER_A_PLOT_PRESETS)) {
      expect(getIndividualTile(preset.baseTileId)).toBeDefined();
    }
  });

  it("keeps default scales in a sensible range", () => {
    for (const preset of Object.values(LETTER_A_PLOT_PRESETS)) {
      expect(preset.layer.scale).toBeGreaterThanOrEqual(0.08);
      expect(preset.layer.scale).toBeLessThanOrEqual(0.6);
    }
  });

  it("resolves presets by stage", () => {
    const preset = letterFruitPlotPresetForStage("a", "seed");
    expect(preset.fruitStage).toBe("seed");
    expect(getLetterFruitPlotPreset("letter_a_seed")).toEqual(preset);
  });

  it("defaults non-A letters from Letter A template", () => {
    expect(getLetterFruitPlotPreset("letter_b_seed")).toEqual(
      getLetterFruitPlotPreset("letter_a_seed"),
    );
    expect(getLetterFruitPlotPreset("letter_j_green_ripe").fruitStage).toBe("ripe");
  });

  it("ripe default placement is smaller than walk-based auto-fit height", () => {
    const bounds = LETTER_A_FRUIT_ATLAS.assets.letter_a_ripe;
    const preset = letterFruitPlotPresetForStage("a", "ripe");
    const placement = computePlotFruitPlacement({
      cellPx: 64,
      cropSw: bounds.sw,
      cropSh: bounds.sh,
      layer: preset.layer,
    });
    const walkBasedHeight = Math.round(bounds.sh * (64 / 331));
    expect(placement.displayH).toBeLessThan(walkBasedHeight);
  });
});

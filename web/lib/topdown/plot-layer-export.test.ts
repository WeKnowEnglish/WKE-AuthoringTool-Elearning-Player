import { describe, expect, it } from "vitest";
import { letterFruitPlotPresetForStage } from "@/lib/topdown/letter-fruit-plot-presets";
import { formatLetterFruitPlotPresetExport } from "@/lib/topdown/plot-layer-export";

describe("plot-layer-export", () => {
  it("formats a paste-ready preset block", () => {
    const preset = letterFruitPlotPresetForStage("a", "seed");
    const text = formatLetterFruitPlotPresetExport("letter_a_seed", preset);
    expect(text).toContain("letter_a_seed:");
    expect(text).toContain('baseTileId: "dirt_tilled"');
    expect(text).toContain('fruitStage: "seed"');
    expect(text).toContain(`scale: ${preset.layer.scale}`);
    expect(text).toContain('anchor: "center"');
  });
});

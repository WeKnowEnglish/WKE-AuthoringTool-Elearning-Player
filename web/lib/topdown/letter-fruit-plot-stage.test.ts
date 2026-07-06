import { describe, expect, it } from "vitest";
import { mockPlotStateToLetterFruitStage } from "@/lib/topdown/letter-fruit-plot-stage";

describe("letter-fruit-plot-stage", () => {
  it("maps mock plot states to letter fruit stages", () => {
    expect(mockPlotStateToLetterFruitStage("empty")).toBeNull();
    expect(mockPlotStateToLetterFruitStage("sprout")).toBe("sprout");
    expect(mockPlotStateToLetterFruitStage("growing")).toBe("young");
    expect(mockPlotStateToLetterFruitStage("watered_growing")).toBe("growing");
    expect(mockPlotStateToLetterFruitStage("ready")).toBe("ripe");
    expect(mockPlotStateToLetterFruitStage("empty_weed_monster")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  computeWeedMonsterPlotPlacement,
  WEED_MONSTER_PLOT_LAYER,
} from "@/lib/topdown/weed-monster-plot";
import { WEED_MONSTER_SPRITE } from "@/lib/topdown/garden-sprite-atlas";

const CELL = 64;

describe("weed-monster-plot", () => {
  it("uses bottom-center anchor preset", () => {
    expect(WEED_MONSTER_PLOT_LAYER.anchor).toBe("bottom-center");
  });

  it("computes a visible placement within the plot cell", () => {
    const placement = computeWeedMonsterPlotPlacement(CELL);
    expect(placement.displayW).toBeGreaterThan(0);
    expect(placement.displayH).toBeGreaterThan(0);
    expect(placement.displayW).toBeLessThanOrEqual(CELL);
    expect(placement.left).toBeGreaterThanOrEqual(0);
    expect(placement.top).toBeGreaterThanOrEqual(-WEED_MONSTER_SPRITE.sh);
    expect(placement.top + placement.displayH).toBeLessThanOrEqual(CELL + 4);
  });

  it("anchors the sprite base near the cell bottom", () => {
    const placement = computeWeedMonsterPlotPlacement(CELL);
    expect(placement.top + placement.displayH).toBeCloseTo(CELL - 8, 0);
  });
});

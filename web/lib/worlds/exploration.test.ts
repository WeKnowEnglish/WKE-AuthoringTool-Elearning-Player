import { describe, expect, it } from "vitest";
import {
  explorationNodeKey,
  flattenExplorationKeys,
  getWorld1ExplorationSummary,
} from "@/lib/worlds/exploration";
import { WORLD_1_SIMPLE } from "@/lib/worlds/world-1-simple";

describe("explorationNodeKey", () => {
  it("formats explore area keys", () => {
    expect(explorationNodeKey({ kind: "explore_area", areaId: "bedroom" })).toBe(
      "explore_area:bedroom",
    );
  });
});

describe("WORLD_1_SIMPLE", () => {
  it("defines 3 explore areas on the world strip", () => {
    expect(WORLD_1_SIMPLE.levels).toHaveLength(3);
    const keys = flattenExplorationKeys(WORLD_1_SIMPLE);
    expect(keys).toEqual([
      "explore_area:bedroom",
      "explore_area:school",
      "explore_area:supermarket",
    ]);
  });
});

describe("getWorld1ExplorationSummary", () => {
  it("returns word-based progress with zero when no collection", () => {
    const summary = getWorld1ExplorationSummary();
    expect(summary.touchedCount).toBe(0);
    expect(summary.totalCount).toBe(18);
    expect(summary.percent).toBe(0);
    expect(summary.levelsWithProgress).toEqual([]);
    expect(summary.areasComplete).toEqual([]);
  });
});

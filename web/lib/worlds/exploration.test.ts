import { describe, expect, it } from "vitest";
import {
  explorationNodeKey,
  flattenExplorationKeys,
  getWorld1ExplorationSummary,
  getWorldExplorationSummary,
  markExplorationNode,
} from "@/lib/worlds/exploration";
import { WORLD_1_SIMPLE } from "@/lib/worlds/world-1-simple";
import type { ExplorationSnapshotV1 } from "@/lib/worlds/exploration";

function emptySnapshot(): ExplorationSnapshotV1 {
  return { schemaVersion: 1, touched: {} };
}

describe("explorationNodeKey", () => {
  it("formats vocab set and hub keys", () => {
    expect(explorationNodeKey({ kind: "vocab_set", setId: "pets" })).toBe("vocab_set:pets");
    expect(explorationNodeKey({ kind: "vocab_hub", hubId: "food" })).toBe("vocab_hub:food");
  });
});

describe("markExplorationNode hubs", () => {
  it("counts hub visits toward world summary", () => {
    const summary = getWorld1ExplorationSummary({
      schemaVersion: 1,
      touched: { "vocab_hub:animals": true, "vocab_set:pets": true },
    });
    expect(summary.touchedCount).toBe(2);
    expect(summary.totalCount).toBe(22);
  });
});

describe("WORLD_1_SIMPLE", () => {
  it("defines 10 levels and 22 unique exploration nodes", () => {
    expect(WORLD_1_SIMPLE.levels).toHaveLength(10);
    const keys = flattenExplorationKeys(WORLD_1_SIMPLE);
    expect(new Set(keys).size).toBe(22);
    expect(keys).toHaveLength(22);
  });
});

describe("getWorldExplorationSummary", () => {
  it("returns zero percent when nothing touched", () => {
    const summary = getWorldExplorationSummary("world_1", emptySnapshot());
    expect(summary.touchedCount).toBe(0);
    expect(summary.totalCount).toBe(22);
    expect(summary.percent).toBe(0);
    expect(summary.levelsWithProgress).toEqual([]);
  });

  it("counts partial progress and level indices", () => {
    let snap = emptySnapshot();
    markExplorationNode({ kind: "vocab_set", setId: "breakfast_food" }, snap);
    snap = { schemaVersion: 1, touched: { "vocab_set:breakfast_food": true } };
    markExplorationNode({ kind: "vocab_set", setId: "pets" }, snap);
    snap = {
      schemaVersion: 1,
      touched: { "vocab_set:breakfast_food": true, "vocab_set:pets": true },
    };
    markExplorationNode({ kind: "vocab_set", setId: "farm_animals" }, snap);
    const summary = getWorld1ExplorationSummary({
      schemaVersion: 1,
      touched: {
        "vocab_set:breakfast_food": true,
        "vocab_set:pets": true,
        "vocab_set:farm_animals": true,
      },
    });
    expect(summary.touchedCount).toBe(3);
    expect(summary.percent).toBe(Math.round((3 / 22) * 100));
    expect(summary.levelsWithProgress).toEqual([1, 5]);
  });

  it("markExplorationNode is idempotent in memory", () => {
    const snap = emptySnapshot();
    const node = { kind: "vocab_set" as const, setId: "weather_words" as const };
    expect(markExplorationNode(node, snap)).toBe(true);
    const after = { schemaVersion: 1 as const, touched: { "vocab_set:weather_words": true } };
    expect(markExplorationNode(node, after)).toBe(false);
  });
});

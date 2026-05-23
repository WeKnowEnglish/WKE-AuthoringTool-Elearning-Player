import { describe, expect, it } from "vitest";
import {
  EXPLORE_ENCOUNTER_TIERS,
  pickExploreWordLoot,
  resolveExploreEncounterRoll,
  rollExploreEncounterTier,
} from "@/lib/explore/explore-encounter-roll";

describe("rollExploreEncounterTier", () => {
  it("returns only valid tiers", () => {
    for (let i = 0; i < 200; i++) {
      const tier = rollExploreEncounterTier(`seed-${i}`);
      expect(["good", "better", "best"]).toContain(tier);
    }
  });

  it("is deterministic for a fixed seed", () => {
    expect(rollExploreEncounterTier("lesson:screen")).toBe(
      rollExploreEncounterTier("lesson:screen"),
    );
  });
});

describe("pickExploreWordLoot", () => {
  it("returns requested count from pool", () => {
    const picked = pickExploreWordLoot(["a", "b", "c"], 2, "x");
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
  });

  it("cycles when count exceeds pool size", () => {
    const picked = pickExploreWordLoot(["only"], 3, "y");
    expect(picked).toEqual(["only", "only", "only"]);
  });
});

describe("resolveExploreEncounterRoll", () => {
  it("maps tier to gold and word counts", () => {
    const r = resolveExploreEncounterRoll("fixed-seed-42", ["w1", "w2", "w3"]);
    expect(r.gold).toBe(EXPLORE_ENCOUNTER_TIERS[r.tier].gold);
    expect(r.wordIds).toHaveLength(EXPLORE_ENCOUNTER_TIERS[r.tier].wordCount);
  });
});

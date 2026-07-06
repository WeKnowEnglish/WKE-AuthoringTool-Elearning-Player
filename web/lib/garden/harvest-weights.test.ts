import { describe, expect, it } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  buildHarvestWeights,
  HARVEST_NEED_MULTIPLIER,
  HARVEST_OFF_LEVEL_FLOOR,
  letterDeficits,
  letterDemandForWords,
  pickWeightedLetter,
  targetWordsForHarvest,
} from "@/lib/garden/harvest-weights";

describe("harvest weights", () => {
  it("computes demand across unspelled words", () => {
    const demand = letterDemandForWords(["CAT", "DOG"]);
    expect(demand).toEqual({ C: 1, A: 1, T: 1, D: 1, O: 1, G: 1 });
  });

  it("computes deficits from inventory", () => {
    const demand = letterDemandForWords(["CAT"]);
    expect(letterDeficits(demand, { C: 1, A: 1 })).toEqual({ T: 1 });
  });

  it("weights needed letters higher than off-level letters", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: [] as string[],
      letters: {},
    };
    const weights = buildHarvestWeights(snap);
    expect(weights.J).toBeGreaterThan(HARVEST_OFF_LEVEL_FLOOR);
    expect(weights.I).toBeGreaterThan(weights.J);
  });

  it("assigns floor weight when no unspelled word uses the letter", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: ["FOX"],
      letters: {},
    };
    const weights = buildHarvestWeights(snap);
    expect(weights.X).toBe(HARVEST_OFF_LEVEL_FLOOR);
  });

  it("boosts deficit letters after partial inventory", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: [
        "QUIZ", "JUMP", "WEB", "FOX", "KID", "HEN", "VAT", "GAS", "RAT", "BOY", "LIP",
      ],
      letters: { C: 1, O: 1 },
    };
    const weights = buildHarvestWeights(snap);
    expect(weights.W).toBeGreaterThan(weights.C ?? 0);
    expect(weights.W).toBe(HARVEST_NEED_MULTIPLIER);
  });

  it("picks deterministically from weights", () => {
    const weights = { A: 1, B: 9 };
    expect(pickWeightedLetter(weights, () => 0)).toBe("A");
    expect(pickWeightedLetter(weights, () => 0.95)).toBe("B");
  });

  it("rolls letters useful for the current level", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: ["COW"],
      letters: { C: 1, O: 1, W: 1 },
    };
    const targets = targetWordsForHarvest(snap);
    expect(targets).not.toContain("COW");
    const weights = buildHarvestWeights(snap);
    const letter = pickWeightedLetter(weights, () => 0.01);
    expect(targets.some((word) => word.includes(letter))).toBe(true);
  });

  it("falls back to next level words when current level is complete", () => {
    const level1 = getLevel1AllSpelledSnapshot();
    const targets = targetWordsForHarvest(level1);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets).toContain("BAT");
  });
});

function getLevel1AllSpelledSnapshot() {
  const snap = {
    ...emptyGardenSnapshot(),
    spellingLevel: 1 as const,
    spelledAtLevel: [
      "QUIZ", "JUMP", "WEB", "FOX", "COW", "KID", "HEN", "VAT", "GAS", "RAT", "BOY", "LIP",
    ],
    letters: {},
  };
  return snap;
}

import { describe, expect, it } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  buildHarvestWeights,
  HARVEST_NEED_MULTIPLIER,
  HARVEST_OFF_LEVEL_FLOOR,
  letterDeficits,
  letterDemandForWords,
  pickWeightedLetter,
  rollWeightedHarvestLetter,
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
    expect(weights.C).toBeGreaterThan(HARVEST_OFF_LEVEL_FLOOR);
    expect(weights.T).toBeGreaterThan(weights.C);
  });

  it("assigns floor weight when no unspelled word uses the letter", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: ["SIX", "FOX"],
      letters: {},
    };
    const weights = buildHarvestWeights(snap);
    expect(weights.X).toBe(HARVEST_OFF_LEVEL_FLOOR);
  });

  it("boosts deficit letters after partial inventory", () => {
    const snap = {
      ...emptyGardenSnapshot(),
      spellingLevel: 1 as const,
      spelledAtLevel: [] as string[],
      letters: { C: 1, A: 1 },
    };
    const weights = buildHarvestWeights(snap);
    expect(weights.T).toBeGreaterThan(weights.C ?? 0);
    expect(weights.C).toBe(HARVEST_NEED_MULTIPLIER);
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
      spelledAtLevel: ["DOG"],
      letters: { D: 1, O: 1, G: 1 },
    };
    const targets = targetWordsForHarvest(snap);
    expect(targets).not.toContain("DOG");
    const letter = rollWeightedHarvestLetter(snap, () => 0.01);
    expect(["C", "A", "T"]).toContain(letter);
  });

  it("falls back to next level words when current level is complete", () => {
    const level1 = getLevel1AllSpelledSnapshot();
    const targets = targetWordsForHarvest(level1);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets).toContain("ANT");
  });
});

function getLevel1AllSpelledSnapshot() {
  const snap = {
    ...emptyGardenSnapshot(),
    spellingLevel: 1 as const,
    spelledAtLevel: [
      "AM", "AT", "BE", "BY", "CAT", "COW", "DOG", "EGG", "FOX", "GUM", "HAT", "HEN",
      "JAM", "KID", "LIP", "MAN", "NUT", "OAK", "PEN", "QUIZ", "RAT", "RUN", "SIX",
      "SUN", "TUB", "VAN", "WEB", "YES", "YOU", "ZOO",
    ],
    letters: {},
  };
  return snap;
}

import { describe, expect, it } from "vitest";
import {
  GARDEN_SPELLING_LEVELS,
  GARDEN_SPELLING_VOCAB,
  missingAlphabetLetters,
} from "@/lib/garden/spelling-levels";

describe("garden spelling levels", () => {
  it("defines 6 levels", () => {
    expect(GARDEN_SPELLING_LEVELS).toHaveLength(6);
    expect(GARDEN_SPELLING_LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("each level uses every letter A–Z across its word list", () => {
    for (const level of GARDEN_SPELLING_LEVELS) {
      const missing = missingAlphabetLetters(level.words);
      expect(missing, `level ${level.id} (${level.title}) missing ${missing.join(", ")}`).toEqual(
        [],
      );
    }
  });

  it("keeps words within each level length band", () => {
    for (const level of GARDEN_SPELLING_LEVELS) {
      for (const word of level.words) {
        expect(word.length).toBeGreaterThanOrEqual(level.minWordLength);
        expect(word.length).toBeLessThanOrEqual(level.maxWordLength);
      }
    }
  });

  it("only includes known garden spelling vocabulary", () => {
    for (const level of GARDEN_SPELLING_LEVELS) {
      for (const word of level.words) {
        expect(GARDEN_SPELLING_VOCAB.has(word)).toBe(true);
      }
    }
  });

  it("levels increase in word length", () => {
    expect(GARDEN_SPELLING_LEVELS[0]!.maxWordLength).toBeLessThanOrEqual(
      GARDEN_SPELLING_LEVELS[5]!.minWordLength,
    );
  });
});

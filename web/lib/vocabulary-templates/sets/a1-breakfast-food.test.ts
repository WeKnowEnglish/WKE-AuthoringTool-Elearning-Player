import { describe, expect, it } from "vitest";
import { wordsForLearnScreen } from "../build-screens";
import { vocabClozeVariants } from "../vocab-cloze";
import { validateVocabularySetDefinition } from "../validate";
import { A1_BREAKFAST_FOOD } from "./a1-breakfast-food";
import { BREAKFAST_FOOD_MEDIA_URLS } from "./breakfast-food-media";

describe("A1_BREAKFAST_FOOD content", () => {
  it("passes definition validation", () => {
    expect(validateVocabularySetDefinition(A1_BREAKFAST_FOOD)).toEqual([]);
  });

  it("has fifteen words with cloze and grammar for T/F statements", () => {
    expect(A1_BREAKFAST_FOOD.words).toHaveLength(15);
    expect(A1_BREAKFAST_FOOD.words.map((w) => w.id)).toEqual(
      expect.arrayContaining(["water", "coffee", "tea"]),
    );
    for (const w of A1_BREAKFAST_FOOD.words) {
      const variants = vocabClozeVariants(w);
      expect(variants.length).toBeGreaterThanOrEqual(2);
      for (const c of variants) {
        expect(c.template).toMatch(/__1__/);
        expect(c.acceptable.length).toBeGreaterThan(0);
      }
      expect(w.grammar, `grammar for ${w.id}`).toBeTruthy();
    }
  });

  it("omits water, coffee, and tea from learn only", () => {
    const learnIds = wordsForLearnScreen(A1_BREAKFAST_FOOD).map((w) => w.id);
    expect(learnIds).toHaveLength(12);
    expect(learnIds).not.toEqual(expect.arrayContaining(["water", "coffee", "tea"]));
    expect(A1_BREAKFAST_FOOD.words.map((w) => w.id)).toEqual(
      expect.arrayContaining(["water", "coffee", "tea"]),
    );
  });

  it("uses library media for most breakfast words", () => {
    const withLibrary = A1_BREAKFAST_FOOD.words.filter((w) =>
      (BREAKFAST_FOOD_MEDIA_URLS as Record<string, string | undefined>)[w.id]?.includes("supabase"),
    );
    expect(withLibrary.length).toBeGreaterThanOrEqual(10);
  });
});

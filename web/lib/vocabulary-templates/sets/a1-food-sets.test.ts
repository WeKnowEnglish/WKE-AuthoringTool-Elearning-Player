import { describe, expect, it } from "vitest";
import { wordsForLearnScreen } from "../build-screens";
import { thisLemmaStatement } from "../lemma-statement";
import { learnSpeechText } from "../vocab-learn-phrases";
import { vocabClozeVariants } from "../vocab-cloze";
import { validateVocabularySetDefinition } from "../validate";
import { A1_BREAKFAST_FOOD } from "./a1-breakfast-food";
import { A1_FOOD_FRUIT } from "./a1-food-fruit";
import { A1_FOOD_MEALS } from "./a1-food-meals";
import { A1_FOOD_SNACKS } from "./a1-food-snacks";
import {
  BREAKFAST_FOOD_MEDIA_URLS,
  FOOD_FRUIT_MEDIA_URLS,
  FOOD_MEALS_MEDIA_URLS,
  FOOD_SNACKS_MEDIA_URLS,
} from "./food-media";

const NEW_SETS = [A1_FOOD_FRUIT, A1_FOOD_MEALS, A1_FOOD_SNACKS] as const;

describe("A1 food vocabulary sets", () => {
  it.each(NEW_SETS.map((def) => [def.id, def] as const))(
    "%s passes validation with 15 words and 12 learn words",
    (_id, def) => {
      expect(validateVocabularySetDefinition(def)).toEqual([]);
      expect(def.words).toHaveLength(15);
      for (const w of def.words) {
        expect(vocabClozeVariants(w).length).toBeGreaterThanOrEqual(2);
      }
      expect(wordsForLearnScreen(def)).toHaveLength(12);
      expect(def.learnExcludeWordIds).toHaveLength(3);
    },
  );

  it("declares food learn phrase themes", () => {
    expect(A1_FOOD_FRUIT.learnPhraseTheme).toBe("food_fruit");
    expect(A1_FOOD_MEALS.learnPhraseTheme).toBe("food_meals");
    expect(A1_FOOD_SNACKS.learnPhraseTheme).toBe("food_snacks");
  });

  it("uses distinct lemmas across food sets", () => {
    const all = [
      ...A1_BREAKFAST_FOOD.words.map((w) => w.lemma.toLowerCase()),
      ...A1_FOOD_FRUIT.words.map((w) => w.lemma.toLowerCase()),
      ...A1_FOOD_MEALS.words.map((w) => w.lemma.toLowerCase()),
      ...A1_FOOD_SNACKS.words.map((w) => w.lemma.toLowerCase()),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("uses supabase URLs for curated media", () => {
    const fruitWithMedia = new Set(Object.keys(FOOD_FRUIT_MEDIA_URLS));
    for (const w of A1_FOOD_FRUIT.words) {
      if (fruitWithMedia.has(w.id)) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      }
    }
    for (const w of A1_FOOD_MEALS.words) {
      if ((FOOD_MEALS_MEDIA_URLS as Record<string, string | undefined>)[w.id]) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      }
    }
    for (const w of A1_FOOD_SNACKS.words) {
      if ((FOOD_SNACKS_MEDIA_URLS as Record<string, string | undefined>)[w.id]) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      }
    }
  });

  it("builds food learn speech with themed phrases", () => {
    const apple = A1_FOOD_FRUIT.words.find((w) => w.id === "apple")!;
    expect(learnSpeechText(apple, "food-fruit-test", "food_fruit")).toMatch(
      /I (like|eat|This is)/,
    );
    expect(thisLemmaStatement(apple)).toBe("This is an apple.");
  });

  it("breakfast no longer includes fruit or rice", () => {
    const ids = A1_BREAKFAST_FOOD.words.map((w) => w.id);
    expect(ids).not.toEqual(expect.arrayContaining(["apple", "banana", "orange", "rice", "noodles"]));
    expect(ids).toEqual(expect.arrayContaining(["ham", "yogurt", "toast", "waffles"]));
    const withLibrary = A1_BREAKFAST_FOOD.words.filter((w) =>
      (BREAKFAST_FOOD_MEDIA_URLS as Record<string, string | undefined>)[w.id]?.includes("supabase"),
    );
    expect(withLibrary.length).toBeGreaterThanOrEqual(9);
  });
});

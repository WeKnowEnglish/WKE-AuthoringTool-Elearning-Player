import { describe, expect, it } from "vitest";
import { wordsForLearnScreen } from "../build-screens";
import { hasBrokenThisIsPattern, thisLemmaStatement } from "../lemma-statement";
import { vocabClozeVariants } from "../vocab-cloze";
import {
  buildVocabTrueFalseStatement,
  isClozeDerivedSentence,
  isPictureDescriptionStatement,
} from "../vocab-tf-statements";
import { validateVocabularySetDefinition } from "../validate";
import { A1_CLOTHES_EVERYDAY } from "./a1-clothes-everyday";
import { A1_WEATHER_WORDS } from "./a1-weather-words";

const SETS = [A1_CLOTHES_EVERYDAY, A1_WEATHER_WORDS] as const;

describe("A1 clothes and weather vocabulary sets", () => {
  it.each(SETS.map((def) => [def.id, def] as const))(
    "%s passes validation with 15 words and 12 learn words",
    (_id, def) => {
      expect(validateVocabularySetDefinition(def)).toEqual([]);
      expect(def.words).toHaveLength(15);
      for (const w of def.words) {
        expect(w.mealVerb).toBe("none");
        expect(vocabClozeVariants(w).length).toBeGreaterThanOrEqual(2);
      }
      expect(wordsForLearnScreen(def)).toHaveLength(12);
      expect(def.learnExcludeWordIds).toHaveLength(3);
    },
  );

  it("uses supabase URLs for all clothes and weather words", () => {
    for (const def of SETS) {
      for (const w of def.words) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      }
      expect(def.coverImageUrl).toContain("supabase.co");
    }
  });

  it("builds grammatical T/F for sample clothes and weather words", () => {
    const shirt = A1_CLOTHES_EVERYDAY.words.find((w) => w.id === "shirt")!;
    expect(thisLemmaStatement(shirt)).toBe("This is a shirt.");

    const rainy = A1_WEATHER_WORDS.words.find((w) => w.id === "rainy")!;
    expect(thisLemmaStatement(rainy)).toBe("This is rainy.");

    const built = buildVocabTrueFalseStatement(A1_WEATHER_WORDS, rainy, "tf-test");
    expect(isPictureDescriptionStatement(built.statement)).toBe(true);
    expect(hasBrokenThisIsPattern(built.statement)).toBe(false);
    expect(isClozeDerivedSentence(A1_WEATHER_WORDS, built.statement)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { wordsForLearnScreen } from "../build-screens";
import { vocabClozeVariants } from "../vocab-cloze";
import { validateVocabularySetDefinition } from "../validate";
import { A1_FARM_ANIMALS } from "./a1-farm-animals";
import { A1_PETS } from "./a1-pets";
import { A1_SEA_ANIMALS } from "./a1-sea-animals";
import { A1_WILD_ANIMALS } from "./a1-wild-animals";

const ANIMAL_SETS = [A1_WILD_ANIMALS, A1_PETS, A1_SEA_ANIMALS, A1_FARM_ANIMALS] as const;

describe("A1 animal vocabulary sets", () => {
  it.each(ANIMAL_SETS.map((def) => [def.id, def] as const))(
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

  it("keeps snake in pets only and fish in sea only", () => {
    expect(A1_PETS.words.map((w) => w.id)).toContain("snake");
    expect(A1_WILD_ANIMALS.words.map((w) => w.id)).not.toContain("snake");
    expect(A1_PETS.words.map((w) => w.id)).toContain("goldfish");
    expect(A1_SEA_ANIMALS.words.map((w) => w.id)).toContain("fish");
    expect(A1_PETS.words.map((w) => w.id)).not.toContain("fish");
  });
});

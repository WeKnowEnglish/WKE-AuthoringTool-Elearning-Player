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
import { A1_SCHOOL_ACTIVITIES } from "./a1-school-activities";
import { A1_SCHOOL_SUPPLIES } from "./a1-school-supplies";
import {
  SCHOOL_ACTIVITIES_MEDIA_URLS,
  SCHOOL_SUPPLIES_MEDIA_URLS,
} from "./school-media";

const SETS = [A1_SCHOOL_SUPPLIES, A1_SCHOOL_ACTIVITIES] as const;

const SUPPLIES_WITH_MEDIA = new Set(Object.keys(SCHOOL_SUPPLIES_MEDIA_URLS));
const ACTIVITIES_WITH_MEDIA = new Set(Object.keys(SCHOOL_ACTIVITIES_MEDIA_URLS));

describe("A1 school vocabulary sets", () => {
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

  it("declares school learn phrase themes", () => {
    expect(A1_SCHOOL_SUPPLIES.learnPhraseTheme).toBe("school_supplies");
    expect(A1_SCHOOL_ACTIVITIES.learnPhraseTheme).toBe("school_activities");
  });

  it("uses supabase URLs for curated media and placeholders for the rest", () => {
    for (const w of A1_SCHOOL_SUPPLIES.words) {
      const hasMedia = SUPPLIES_WITH_MEDIA.has(w.id);
      if (hasMedia) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      } else {
        expect(w.imageUrl, w.id).toContain("placehold.co");
      }
    }
    for (const w of A1_SCHOOL_ACTIVITIES.words) {
      const hasMedia = ACTIVITIES_WITH_MEDIA.has(w.id);
      if (hasMedia) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      } else {
        expect(w.imageUrl, w.id).toContain("placehold.co");
      }
    }
    expect(A1_SCHOOL_SUPPLIES.coverImageUrl).toContain("supabase.co");
    expect(A1_SCHOOL_ACTIVITIES.coverImageUrl).toContain("supabase.co");
  });

  it("builds grammatical T/F for sample school words", () => {
    const pencil = A1_SCHOOL_SUPPLIES.words.find((w) => w.id === "pencil")!;
    expect(thisLemmaStatement(pencil)).toBe("This is a pencil.");

    const write = A1_SCHOOL_ACTIVITIES.words.find((w) => w.id === "write")!;
    expect(thisLemmaStatement(write)).toBe("This is write.");

    const built = buildVocabTrueFalseStatement(A1_SCHOOL_SUPPLIES, pencil, "tf-test");
    expect(isPictureDescriptionStatement(built.statement)).toBe(true);
    expect(hasBrokenThisIsPattern(built.statement)).toBe(false);
    expect(isClozeDerivedSentence(A1_SCHOOL_SUPPLIES, built.statement)).toBe(false);
  });
});

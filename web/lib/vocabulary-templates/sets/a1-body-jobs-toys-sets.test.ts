import { describe, expect, it } from "vitest";
import { wordsForLearnScreen } from "../build-screens";
import { hasBrokenThisIsPattern, thisLemmaStatement } from "../lemma-statement";
import {
  buildVocabTrueFalseStatement,
  isClozeDerivedSentence,
  isPictureDescriptionStatement,
} from "../vocab-tf-statements";
import { validateVocabularySetDefinition } from "../validate";
import { A1_BODY_HEAD_FACE } from "./a1-body-head-face";
import { A1_BODY_LIMBS_INSIDE } from "./a1-body-limbs-inside";
import { A1_JOBS_COMMUNITY } from "./a1-jobs-community";
import { A1_JOBS_CREATIVE } from "./a1-jobs-creative";
import { A1_TOYS_EVERYDAY } from "./a1-toys-everyday";
import { BODY_HEAD_FACE_MEDIA_URLS, BODY_LIMBS_INSIDE_MEDIA_URLS } from "./body-media";
import { JOBS_COMMUNITY_MEDIA_URLS, JOBS_CREATIVE_MEDIA_URLS } from "./jobs-media";
import { TOYS_EVERYDAY_MEDIA_URLS } from "./toys-media";

const BODY_SETS = [A1_BODY_HEAD_FACE, A1_BODY_LIMBS_INSIDE] as const;
const JOBS_SETS = [A1_JOBS_COMMUNITY, A1_JOBS_CREATIVE] as const;

describe("A1 body vocabulary sets", () => {
  it.each(BODY_SETS.map((def) => [def.id, def] as const))(
    "%s passes validation with 15 words and 12 learn words",
    (_id, def) => {
      expect(validateVocabularySetDefinition(def)).toEqual([]);
      expect(def.words).toHaveLength(15);
      expect(wordsForLearnScreen(def)).toHaveLength(12);
      expect(def.learnExcludeWordIds).toHaveLength(3);
    },
  );

  it("uses supabase URLs for curated body media", () => {
    const headMedia = new Set(Object.keys(BODY_HEAD_FACE_MEDIA_URLS));
    for (const w of A1_BODY_HEAD_FACE.words) {
      if (headMedia.has(w.id)) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      }
    }
    const limbsMedia = new Set(Object.keys(BODY_LIMBS_INSIDE_MEDIA_URLS));
    for (const w of A1_BODY_LIMBS_INSIDE.words) {
      if (limbsMedia.has(w.id)) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      } else {
        expect(w.imageUrl, w.id).toContain("placehold.co");
      }
    }
  });

  it("builds grammatical T/F for sample body words", () => {
    const head = A1_BODY_HEAD_FACE.words.find((w) => w.id === "head")!;
    expect(thisLemmaStatement(head)).toBe("This is a head.");
    const built = buildVocabTrueFalseStatement(A1_BODY_HEAD_FACE, head, "tf-body");
    expect(isPictureDescriptionStatement(built.statement)).toBe(true);
    expect(hasBrokenThisIsPattern(built.statement)).toBe(false);
    expect(isClozeDerivedSentence(A1_BODY_HEAD_FACE, built.statement)).toBe(false);
  });
});

describe("A1 jobs vocabulary sets", () => {
  it.each(JOBS_SETS.map((def) => [def.id, def] as const))(
    "%s passes validation with 15 words and 12 learn words",
    (_id, def) => {
      expect(validateVocabularySetDefinition(def)).toEqual([]);
      expect(def.words).toHaveLength(15);
      expect(wordsForLearnScreen(def)).toHaveLength(12);
      expect(def.learnExcludeWordIds).toHaveLength(3);
    },
  );

  it("uses supabase for community jobs and mixed media for creative set", () => {
    const communityMedia = new Set(Object.keys(JOBS_COMMUNITY_MEDIA_URLS));
    for (const w of A1_JOBS_COMMUNITY.words) {
      expect(communityMedia.has(w.id), w.id).toBe(true);
      expect(w.imageUrl, w.id).toContain("supabase.co");
    }
    const creativeMedia = new Set(Object.keys(JOBS_CREATIVE_MEDIA_URLS));
    for (const w of A1_JOBS_CREATIVE.words) {
      if (creativeMedia.has(w.id)) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      } else {
        expect(w.imageUrl, w.id).toContain("placehold.co");
      }
    }
  });

  it("includes teacher only in jobs hub (not duplicated in school sets yet)", () => {
    const teacher = A1_JOBS_COMMUNITY.words.find((w) => w.id === "teacher");
    expect(teacher?.lemma).toBe("teacher");
  });
});

describe("A1 toys vocabulary set", () => {
  it("passes validation with 15 words and 12 learn words", () => {
    expect(validateVocabularySetDefinition(A1_TOYS_EVERYDAY)).toEqual([]);
    expect(A1_TOYS_EVERYDAY.words).toHaveLength(15);
    expect(wordsForLearnScreen(A1_TOYS_EVERYDAY)).toHaveLength(12);
    expect(A1_TOYS_EVERYDAY.learnExcludeWordIds).toHaveLength(3);
  });

  it("does not include ball (owned by school_activities)", () => {
    expect(A1_TOYS_EVERYDAY.words.some((w) => w.id === "ball" || w.lemma === "ball")).toBe(
      false,
    );
  });

  it("uses supabase for curated toys media", () => {
    const media = new Set(Object.keys(TOYS_EVERYDAY_MEDIA_URLS));
    for (const w of A1_TOYS_EVERYDAY.words) {
      if (media.has(w.id)) {
        expect(w.imageUrl, w.id).toContain("supabase.co");
      } else {
        expect(w.imageUrl, w.id).toContain("placehold.co");
      }
    }
  });
});

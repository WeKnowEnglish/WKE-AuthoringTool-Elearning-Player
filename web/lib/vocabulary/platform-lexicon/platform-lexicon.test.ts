import { describe, expect, it } from "vitest";
import {
  createPlatformLexiconId,
  findExistingPlatformMatchId,
  mergePlatformSearchEntries,
  stageToCefrBand,
  teacherEntryToPlatformDraft,
  teacherPosToPlatformPos,
  type PlatformLexiconEntry,
} from "@/lib/vocabulary/platform-lexicon";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

function sampleTeacher(overrides: Partial<TeacherLexiconEntry> = {}): TeacherLexiconEntry {
  return {
    id: "tw_promo1",
    teacherId: "t1",
    surface: "hang out",
    normalized: "hang out",
    entryKind: "phrase",
    pos: "verb",
    primaryStage: "A1_2",
    primaryTopic: "friends",
    note: null,
    learnerDefinitionEn: "spend time with friends",
    learnerMeaningVi: "đi chơi",
    status: "ready",
    promotionStatus: "pending",
    promotionSubmittedAt: null,
    promotionReviewedAt: null,
    promotionReviewNote: null,
    promotionReviewedBy: null,
    promotedToId: null,
    promotedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archivedAt: null,
    ...overrides,
  };
}

describe("platform lexicon promote helpers", () => {
  it("maps stage to cefr band and unspecified pos to noun", () => {
    expect(stageToCefrBand("PRE_A1_1")).toBe("PRE_A1");
    expect(stageToCefrBand("A2_2")).toBe("A2");
    expect(teacherPosToPlatformPos("unspecified")).toBe("noun");
    expect(teacherPosToPlatformPos("verb")).toBe("verb");
  });

  it("builds a platform draft from a teacher entry", () => {
    const draft = teacherEntryToPlatformDraft(sampleTeacher());
    expect(draft).toMatchObject({
      lemma: "hang out",
      normalized: "hang out",
      entryKind: "phrase",
      pos: "verb",
      primaryStage: "A1_2",
      cefrBandCandidate: "A1",
      primaryTopic: "friends",
      learnerDefinitionEn: "spend time with friends",
    });
  });

  it("creates pv_ ids", () => {
    expect(createPlatformLexiconId()).toMatch(/^pv_[a-f0-9]+$/);
  });

  it("prefers an existing static match over creating a new id", () => {
    const apple = getPrimaryVocabularySearchEntries().find((e) => e.lemma === "apple");
    expect(apple).toBeTruthy();
    const match = findExistingPlatformMatchId({
      normalized: apple!.normalizedLemma,
      pos: apple!.pos,
      entryKind: "word",
      staticEntries: getPrimaryVocabularySearchEntries(),
      publishedEntries: [],
    });
    expect(match).toBe(apple!.id);
  });

  it("merges published platform rows ahead of static duplicates", () => {
    const staticEntries = getPrimaryVocabularySearchEntries().slice(0, 2);
    const published = [
      {
        ...staticEntries[0]!,
        id: "pv_newpromo",
        lemma: "brandnew",
        normalizedLemma: "brandnew",
        status: "published" as const,
        reviewStatus: "approved" as const,
      },
    ];
    const merged = mergePlatformSearchEntries(staticEntries, published);
    expect(merged[0]?.id).toBe("pv_newpromo");
    expect(merged.some((e) => e.id === staticEntries[0]!.id)).toBe(true);
  });

  it("matches published DB rows by normalized+pos+kind", () => {
    const published: PlatformLexiconEntry[] = [
      {
        id: "pv_db1",
        lemma: "hang out",
        normalized: "hang out",
        entryKind: "phrase",
        pos: "verb",
        primaryStage: "A1_2",
        cefrBandCandidate: "A1",
        primaryTopic: "friends",
        learnerDefinitionEn: "spend time",
        learnerMeaningVi: null,
        note: null,
        vocabularyLane: "general_english",
        status: "published",
        sourceTeacherEntryId: "tw_promo1",
        promotedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    expect(
      findExistingPlatformMatchId({
        normalized: "hang out",
        pos: "verb",
        entryKind: "phrase",
        staticEntries: [],
        publishedEntries: published,
      }),
    ).toBe("pv_db1");
  });
});

import { describe, expect, it } from "vitest";
import {
  canSubmitForCurriculum,
  inferEntryKind,
  isTeacherLexiconReadyForClass,
  mergeTeacherLexiconForPack,
  mergeUnifiedVocabEntries,
  normalizeLexiconSurface,
  resolvePackLexemes,
  resolveSheetSurface,
  searchUnifiedVocab,
  teacherEntryToUnified,
  teacherLexiconEnrichmentHints,
  teacherLexiconPromotionGaps,
  type TeacherLexiconEntry,
} from "@/lib/vocabulary/teacher-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";

function sampleTeacher(overrides: Partial<TeacherLexiconEntry> = {}): TeacherLexiconEntry {
  return {
    id: "tw_testabc",
    teacherId: "t1",
    surface: "gonna",
    normalized: "gonna",
    entryKind: "slang",
    pos: null,
    primaryStage: "A1_1",
    primaryTopic: "general_language",
    note: "informal",
    learnerDefinitionEn: "going to",
    learnerMeaningVi: null,
    status: "teacher_draft",
    promotionStatus: "none",
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

describe("teacher lexicon D2", () => {
  it("normalizes surfaces and infers phrase kind", () => {
    expect(normalizeLexiconSurface("  See   You Later ")).toBe("see you later");
    expect(inferEntryKind("see you later")).toBe("phrase");
    expect(inferEntryKind("gonna", "slang")).toBe("slang");
    expect(inferEntryKind("apple")).toBe("word");
  });

  it("merges teacher entries into unified search ahead of platform", () => {
    const teacher = sampleTeacher();
    const pool = mergeUnifiedVocabEntries(getPrimaryVocabularySearchEntries().slice(0, 5), [teacher]);
    expect(pool[0]?.id).toBe("tw_testabc");
    expect(teacherEntryToUnified(teacher).source).toBe("teacher");

    const hits = searchUnifiedVocab(pool, { query: "gonna", source: "teacher" });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.lemma).toBe("gonna");
  });

  it("matches free-text query against topic tags", () => {
    const pool = mergeUnifiedVocabEntries(getPrimaryVocabularySearchEntries(), []);
    const hits = searchUnifiedVocab(pool, { query: "animals" });
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every(
        (e) =>
          e.primaryTopic.toLowerCase().includes("animal") ||
          e.topics.some((t) => t.toLowerCase().includes("animal")) ||
          e.lemma.toLowerCase().includes("animal"),
      ),
    ).toBe(true);
  });
});

describe("pack lexeme resolution D3", () => {
  it("resolves mixed platform + teacher + missing ids in order", () => {
    const platform = getPrimaryVocabularySearchEntries();
    const apple = platform.find((e) => e.lemma === "apple") ?? platform[0]!;
    const teacher = sampleTeacher({
      id: "tw_pack1",
      surface: "see you later",
      entryKind: "phrase",
    });
    const rows = resolvePackLexemes([apple.id, "tw_pack1", "tw_gone"], platform, [teacher]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: apple.id, source: "platform", lemma: apple.lemma });
    expect(rows[1]).toMatchObject({
      id: "tw_pack1",
      source: "teacher",
      lemma: "see you later",
      entryKind: "phrase",
      definitionEn: "going to",
    });
    expect(rows[2]).toMatchObject({ id: "tw_gone", source: "missing" });
  });

  it("keeps archived teacher rows available for pack display", () => {
    const active = sampleTeacher({ id: "tw_active" });
    const archived = sampleTeacher({
      id: "tw_old",
      surface: "old slang",
      archivedAt: new Date().toISOString(),
      status: "archived",
    });
    const merged = mergeTeacherLexiconForPack([active], [archived]);
    expect(merged.map((e) => e.id).sort()).toEqual(["tw_active", "tw_old"]);
    const rows = resolvePackLexemes(["tw_old"], [], merged);
    expect(rows[0]?.archived).toBe(true);
    expect(rows[0]?.lemma).toBe("old slang");
  });
});

describe("teacher lexicon readiness D4", () => {
  it("treats status ready as ready-for-class", () => {
    expect(isTeacherLexiconReadyForClass(sampleTeacher({ status: "ready" }))).toBe(true);
    expect(isTeacherLexiconReadyForClass(sampleTeacher({ status: "teacher_draft" }))).toBe(false);
    expect(
      isTeacherLexiconReadyForClass(
        sampleTeacher({ status: "archived", archivedAt: new Date().toISOString() }),
      ),
    ).toBe(false);
  });

  it("suggests ready when an English definition exists", () => {
    expect(
      teacherLexiconEnrichmentHints(
        sampleTeacher({ learnerDefinitionEn: "going to", primaryTopic: null }),
      ).suggestedReady,
    ).toBe(true);
    expect(
      teacherLexiconEnrichmentHints(sampleTeacher({ learnerDefinitionEn: null })).suggestedReady,
    ).toBe(false);
  });

  it("filters unified search by ready / draft", () => {
    const draft = sampleTeacher({ id: "tw_draft", status: "teacher_draft", surface: "drafty" });
    const ready = sampleTeacher({ id: "tw_ready", status: "ready", surface: "readyword" });
    const pool = mergeUnifiedVocabEntries([], [draft, ready]);
    expect(searchUnifiedVocab(pool, { readyForClass: "ready" }).map((e) => e.id)).toEqual([
      "tw_ready",
    ]);
    expect(searchUnifiedVocab(pool, { readyForClass: "draft" }).map((e) => e.id)).toEqual([
      "tw_draft",
    ]);
  });
});

describe("teacher lexicon promotion D5 light", () => {
  it("requires ready + English meaning to submit", () => {
    expect(canSubmitForCurriculum(sampleTeacher({ status: "teacher_draft" }))).toBe(false);
    expect(
      canSubmitForCurriculum(
        sampleTeacher({ status: "ready", learnerDefinitionEn: null }),
      ),
    ).toBe(false);
    expect(
      canSubmitForCurriculum(
        sampleTeacher({ status: "ready", learnerDefinitionEn: "going to" }),
      ),
    ).toBe(true);
    expect(
      canSubmitForCurriculum(
        sampleTeacher({
          status: "ready",
          learnerDefinitionEn: "going to",
          promotionStatus: "pending",
        }),
      ),
    ).toBe(false);
  });

  it("lists metadata gaps for the review queue", () => {
    const gaps = teacherLexiconPromotionGaps(
      sampleTeacher({
        pos: null,
        primaryStage: null,
        primaryTopic: null,
        learnerDefinitionEn: "x",
        learnerMeaningVi: null,
      }),
    );
    expect(gaps).toEqual([
      "pos",
      "primaryStage",
      "primaryTopic",
      "learnerMeaningVi",
    ]);
  });

  it("resolves promoted teacher ids via platform alias", () => {
    const platform = getPrimaryVocabularySearchEntries();
    const apple = platform.find((e) => e.lemma === "apple") ?? platform[0]!;
    const teacher = sampleTeacher({
      id: "tw_aliased",
      surface: "apple",
      status: "ready",
      promotionStatus: "approved",
      promotedToId: apple.id,
    });
    const rows = resolvePackLexemes(["tw_aliased"], platform, [teacher]);
    expect(rows[0]).toMatchObject({
      id: "tw_aliased",
      source: "platform",
      lemma: apple.lemma,
      promotedToId: apple.id,
    });
  });
});

describe("pack sheet surface resolve", () => {
  it("finds an exact dictionary lemma", () => {
    const pool = mergeUnifiedVocabEntries(getPrimaryVocabularySearchEntries(), []);
    const apple = pool.find((e) => e.lemma === "apple");
    expect(apple).toBeTruthy();
    expect(resolveSheetSurface("  Apple ", pool)).toMatchObject({
      status: "found",
      entry: { id: apple!.id },
    });
  });

  it("marks unknown surfaces as missing", () => {
    const pool = mergeUnifiedVocabEntries(getPrimaryVocabularySearchEntries().slice(0, 20), []);
    expect(resolveSheetSurface("zzzxnotaword", pool)).toMatchObject({
      status: "missing",
      normalized: "zzzxnotaword",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  addVocabEntryFromFields,
  createBlankVocabularyListDocument,
  validateVocabularyListDocument,
  vocabListFieldsFromLexiconId,
} from "@/lib/activity-builder/vocabulary-list";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";

function teacherEntry(partial: Partial<TeacherLexiconEntry> & Pick<TeacherLexiconEntry, "id" | "surface">): TeacherLexiconEntry {
  return {
    teacherId: "t1",
    normalized: partial.surface.toLowerCase(),
    entryKind: "word",
    pos: "noun",
    primaryStage: null,
    primaryTopic: null,
    note: null,
    learnerDefinitionEn: null,
    learnerMeaningVi: null,
    status: "ready",
    promotionStatus: "none",
    promotionSubmittedAt: null,
    promotionReviewedAt: null,
    promotionReviewNote: null,
    promotionReviewedBy: null,
    promotedToId: null,
    promotedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...partial,
  };
}

describe("vocabulary list lexicon bridge", () => {
  it("snapshots a Primary candidate into list fields", () => {
    const platform = getPrimaryVocabularySearchEntries();
    const apple = platform.find((entry) => entry.lemma.toLowerCase() === "apple") ?? platform[0]!;
    const fields = vocabListFieldsFromLexiconId(apple.id, [], platform);
    expect(fields).not.toBeNull();
    expect(fields!.word.toLowerCase()).toBe(apple.lemma.toLowerCase());
    expect(fields!.sourceWordId).toBe(apple.id);
  });

  it("snapshots a teacher lexicon entry", () => {
    const teacher = teacherEntry({
      id: "tw_test_1",
      surface: "see you later",
      learnerDefinitionEn: "goodbye for now",
      note: "informal",
    });
    const fields = vocabListFieldsFromLexiconId(teacher.id, [teacher]);
    expect(fields).toEqual({
      word: "see you later",
      definitionEn: "goodbye for now",
      notes: "informal",
      sourceWordId: "tw_test_1",
    });
  });

  it("adds from lexicon and dedupes by source id and lemma", () => {
    let doc = createBlankVocabularyListDocument();
    doc = {
      ...doc,
      entries: [{ id: "v1", word: "placeholder" }],
    };

    const first = addVocabEntryFromFields(doc, {
      word: "bread",
      definitionEn: "bakery food",
      sourceWordId: "pv_bread",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    doc = first.document;

    const dupSource = addVocabEntryFromFields(doc, {
      word: "Bread",
      sourceWordId: "pv_bread",
    });
    expect(dupSource.ok).toBe(false);
    if (dupSource.ok) return;
    expect(dupSource.reason).toBe("duplicate_source");

    const dupWord = addVocabEntryFromFields(doc, {
      word: "BREAD",
      sourceWordId: "pv_other",
    });
    expect(dupWord.ok).toBe(false);
    if (dupWord.ok) return;
    expect(dupWord.reason).toBe("duplicate_word");

    const validated = validateVocabularyListDocument(doc);
    expect(validated.entries.some((entry) => entry.sourceWordId === "pv_bread")).toBe(true);
  });

  it("round-trips sourceWordId through validate", () => {
    const validated = validateVocabularyListDocument({
      version: 1,
      kind: "vocabulary-list",
      id: "list-1",
      name: "Linked",
      entries: [
        {
          id: "v1",
          word: "cake",
          sourceWordId: "pv_cake",
          definitionEn: "sweet food",
        },
      ],
    });
    expect(validated.entries[0]?.sourceWordId).toBe("pv_cake");
  });
});

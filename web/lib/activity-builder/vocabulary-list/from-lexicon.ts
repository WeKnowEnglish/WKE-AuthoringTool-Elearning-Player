import type { VocabListEntry } from "@/lib/activity-builder/vocabulary-list/types";
import {
  getPrimaryVocabularyCandidateById,
  type PrimaryVocabularySearchIndexEntry,
} from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "@/lib/vocabulary/teacher-lexicon";
import { isTeacherLexiconId } from "@/lib/vocabulary/teacher-lexicon";

function cleanOptional(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

/**
 * Snapshot lemma / definition / example from a lexicon id into list fields.
 * Prefers full Primary candidate rows; falls back to teacher lexicon / search index.
 */
export function vocabListFieldsFromLexiconId(
  wordId: string,
  teacherEntries: readonly TeacherLexiconEntry[],
  platformEntries: readonly PrimaryVocabularySearchIndexEntry[] = [],
): Omit<VocabListEntry, "id"> | null {
  const id = wordId.trim();
  if (!id) return null;

  if (isTeacherLexiconId(id)) {
    const teacher = teacherEntries.find((entry) => entry.id === id);
    if (!teacher || teacher.archivedAt) return null;
    return {
      word: teacher.surface.trim() || id,
      definitionEn: cleanOptional(teacher.learnerDefinitionEn),
      notes: cleanOptional(teacher.note),
      sourceWordId: id,
    };
  }

  const candidate = getPrimaryVocabularyCandidateById(id);
  if (candidate) {
    return {
      word: candidate.lemma.trim() || id,
      definitionEn: cleanOptional(candidate.learnerDefinitionEn),
      example: cleanOptional(candidate.exampleSentence),
      sourceWordId: id,
    };
  }

  const platform = platformEntries.find((entry) => entry.id === id);
  if (platform) {
    const teacherPromoted = teacherEntries.find((entry) => entry.promotedToId === id);
    return {
      word: platform.lemma.trim() || id,
      definitionEn: cleanOptional(teacherPromoted?.learnerDefinitionEn),
      notes: cleanOptional(teacherPromoted?.note),
      sourceWordId: id,
    };
  }

  const teacherPromoted = teacherEntries.find((entry) => entry.promotedToId === id);
  if (teacherPromoted) {
    return {
      word: teacherPromoted.surface.trim() || id,
      definitionEn: cleanOptional(teacherPromoted.learnerDefinitionEn),
      notes: cleanOptional(teacherPromoted.note),
      sourceWordId: id,
    };
  }

  return null;
}

export function normalizeVocabLemma(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

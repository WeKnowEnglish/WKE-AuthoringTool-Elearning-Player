import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry } from "./types";
import { isTeacherLexiconId } from "./types";

export type PackLexemeResolution = {
  id: string;
  lemma: string;
  pos: string;
  primaryStageCandidate: string;
  primaryTopic: string;
  source: "platform" | "teacher" | "missing";
  entryKind?: string;
  note?: string | null;
  definitionEn?: string | null;
  definitionVi?: string | null;
  status?: string;
  archived: boolean;
  readyForClass: boolean;
  /** When pack still stores `tw_*` but entry was promoted. */
  promotedToId?: string | null;
};

/**
 * Resolve ordered pack word_ids against platform candidates + teacher lexicon.
 * If a teacher entry has `promotedToId`, enrich from that platform row (alias).
 */
export function resolvePackLexemes(
  wordIds: readonly string[],
  platform: readonly PrimaryVocabularySearchIndexEntry[],
  teacher: readonly TeacherLexiconEntry[],
): PackLexemeResolution[] {
  const platformById = new Map(platform.map((e) => [e.id, e]));
  const teacherById = new Map(teacher.map((e) => [e.id, e]));

  return wordIds.map((id) => {
    const platformEntry = platformById.get(id);
    if (platformEntry) {
      return {
        id,
        lemma: platformEntry.lemma,
        pos: platformEntry.pos,
        primaryStageCandidate: platformEntry.primaryStageCandidate,
        primaryTopic: platformEntry.primaryTopic,
        source: "platform" as const,
        archived: false,
        readyForClass: true,
      };
    }

    const teacherEntry = teacherById.get(id);
    if (teacherEntry?.promotedToId) {
      const promoted = platformById.get(teacherEntry.promotedToId);
      if (promoted) {
        return {
          id,
          lemma: promoted.lemma,
          pos: promoted.pos,
          primaryStageCandidate: promoted.primaryStageCandidate,
          primaryTopic: promoted.primaryTopic,
          source: "platform" as const,
          definitionEn: teacherEntry.learnerDefinitionEn,
          definitionVi: teacherEntry.learnerMeaningVi,
          archived: false,
          readyForClass: true,
          promotedToId: teacherEntry.promotedToId,
        };
      }
    }

    if (teacherEntry) {
      return {
        id,
        lemma: teacherEntry.surface,
        pos: teacherEntry.pos ?? "unspecified",
        primaryStageCandidate: teacherEntry.primaryStage ?? "",
        primaryTopic: teacherEntry.primaryTopic ?? "",
        source: "teacher" as const,
        entryKind: teacherEntry.entryKind,
        note: teacherEntry.note,
        definitionEn: teacherEntry.learnerDefinitionEn,
        definitionVi: teacherEntry.learnerMeaningVi,
        status: teacherEntry.status,
        archived: Boolean(teacherEntry.archivedAt) || teacherEntry.status === "archived",
        readyForClass: teacherEntry.status === "ready",
        promotedToId: teacherEntry.promotedToId,
      };
    }

    return {
      id,
      lemma: id,
      pos: "",
      primaryStageCandidate: "",
      primaryTopic: "",
      source: "missing" as const,
      archived: false,
      readyForClass: false,
    };
  });
}

/** Merge active lexicon with pack-referenced teacher rows (incl. archived). */
export function mergeTeacherLexiconForPack(
  active: readonly TeacherLexiconEntry[],
  packReferenced: readonly TeacherLexiconEntry[],
): TeacherLexiconEntry[] {
  const byId = new Map<string, TeacherLexiconEntry>();
  for (const entry of active) byId.set(entry.id, entry);
  for (const entry of packReferenced) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  return [...byId.values()];
}

export function teacherIdsInPack(wordIds: readonly string[]): string[] {
  return wordIds.filter(isTeacherLexiconId);
}

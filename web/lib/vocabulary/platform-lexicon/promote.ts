import type {
  CefrBandCandidate,
  PartOfSpeech,
  PrimaryStage,
  PrimaryVocabularySearchIndexEntry,
} from "@/lib/vocabulary/primary-candidates";
import type { TeacherLexiconEntry, TeacherLexiconEntryKind } from "@/lib/vocabulary/teacher-lexicon/types";

export const PLATFORM_LEXICON_ID_PREFIX = "pv_";

export type PlatformLexiconEntry = {
  id: string;
  lemma: string;
  normalized: string;
  entryKind: TeacherLexiconEntryKind;
  pos: PartOfSpeech;
  primaryStage: PrimaryStage | null;
  cefrBandCandidate: CefrBandCandidate | null;
  primaryTopic: string | null;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
  note: string | null;
  vocabularyLane: string;
  status: "published" | "deprecated";
  sourceTeacherEntryId: string | null;
  promotedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createPlatformLexiconId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${PLATFORM_LEXICON_ID_PREFIX}${hex}`;
}

export function stageToCefrBand(stage: string | null | undefined): CefrBandCandidate | null {
  if (!stage) return null;
  if (stage.startsWith("PRE_A1")) return "PRE_A1";
  if (stage.startsWith("A1")) return "A1";
  if (stage.startsWith("A2")) return "A2";
  return null;
}

export function teacherPosToPlatformPos(
  pos: TeacherLexiconEntry["pos"],
): PartOfSpeech {
  if (!pos || pos === "unspecified") return "noun";
  return pos;
}

export function teacherEntryToPlatformDraft(entry: TeacherLexiconEntry): {
  lemma: string;
  normalized: string;
  entryKind: TeacherLexiconEntryKind;
  pos: PartOfSpeech;
  primaryStage: PrimaryStage | null;
  cefrBandCandidate: CefrBandCandidate | null;
  primaryTopic: string | null;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
  note: string | null;
} {
  const primaryStage = (entry.primaryStage as PrimaryStage | null) ?? null;
  return {
    lemma: entry.surface.trim(),
    normalized: entry.normalized,
    entryKind: entry.entryKind,
    pos: teacherPosToPlatformPos(entry.pos),
    primaryStage,
    cefrBandCandidate: stageToCefrBand(entry.primaryStage),
    primaryTopic: entry.primaryTopic,
    learnerDefinitionEn: entry.learnerDefinitionEn,
    learnerMeaningVi: entry.learnerMeaningVi,
    note: entry.note,
  };
}

export function platformEntryToSearchIndexEntry(
  entry: PlatformLexiconEntry,
): PrimaryVocabularySearchIndexEntry {
  return {
    id: entry.id,
    lemma: entry.lemma,
    normalizedLemma: entry.normalized,
    pos: entry.pos,
    cefrBandCandidate: entry.cefrBandCandidate ?? "A1",
    primaryStageCandidate: entry.primaryStage ?? "A1_1",
    primaryTopic: entry.primaryTopic ?? "",
    topics: entry.primaryTopic ? [entry.primaryTopic] : [],
    vocabularyLane: (entry.vocabularyLane as PrimaryVocabularySearchIndexEntry["vocabularyLane"]) ||
      "general_english",
    status: entry.status === "deprecated" ? "deprecated" : "published",
    reviewStatus: "approved",
  };
}

/** Prefer published DB rows, then static candidate bank; first id wins. */
export function mergePlatformSearchEntries(
  staticEntries: readonly PrimaryVocabularySearchIndexEntry[],
  published: readonly PrimaryVocabularySearchIndexEntry[],
): PrimaryVocabularySearchIndexEntry[] {
  const byId = new Map<string, PrimaryVocabularySearchIndexEntry>();
  for (const entry of published) byId.set(entry.id, entry);
  for (const entry of staticEntries) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  }
  // Published first so Dictionary surfaces new promotions near the top of merges with teacher.
  return [...published, ...staticEntries.filter((e) => !published.some((p) => p.id === e.id))];
}

export function findExistingPlatformMatchId(input: {
  normalized: string;
  pos: PartOfSpeech;
  entryKind: TeacherLexiconEntryKind;
  staticEntries: readonly PrimaryVocabularySearchIndexEntry[];
  publishedEntries: readonly PlatformLexiconEntry[];
}): string | null {
  const published = input.publishedEntries.find(
    (e) =>
      e.status === "published" &&
      e.normalized === input.normalized &&
      e.pos === input.pos &&
      e.entryKind === input.entryKind,
  );
  if (published) return published.id;

  const staticHit = input.staticEntries.find(
    (e) => e.normalizedLemma === input.normalized && e.pos === input.pos,
  );
  return staticHit?.id ?? null;
}

import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";
import type {
  TeacherLexiconEntry,
  UnifiedVocabSearchEntry,
  UnifiedVocabSearchFilters,
} from "./types";

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value : [value];
}

export function platformEntryToUnified(
  entry: PrimaryVocabularySearchIndexEntry,
): UnifiedVocabSearchEntry {
  return {
    id: entry.id,
    lemma: entry.lemma,
    normalizedLemma: entry.normalizedLemma,
    pos: entry.pos,
    cefrBandCandidate: entry.cefrBandCandidate,
    primaryStageCandidate: entry.primaryStageCandidate,
    primaryTopic: entry.primaryTopic,
    topics: entry.topics,
    vocabularyLane: entry.vocabularyLane,
    status: entry.status,
    reviewStatus: entry.reviewStatus,
    source: "platform",
  };
}

export function teacherEntryToUnified(entry: TeacherLexiconEntry): UnifiedVocabSearchEntry {
  return {
    id: entry.id,
    lemma: entry.surface,
    normalizedLemma: entry.normalized,
    pos: entry.pos ?? "unspecified",
    cefrBandCandidate: "",
    primaryStageCandidate: entry.primaryStage ?? "",
    primaryTopic: entry.primaryTopic ?? "",
    topics: entry.primaryTopic ? [entry.primaryTopic] : [],
    vocabularyLane: "general_english",
    status: entry.status,
    reviewStatus: entry.status === "ready" ? "approved" : "unreviewed",
    source: "teacher",
    entryKind: entry.entryKind,
    note: entry.note,
    definitionEn: entry.learnerDefinitionEn,
    definitionVi: entry.learnerMeaningVi,
    readyForClass: entry.status === "ready",
    promotionStatus: entry.promotionStatus,
  };
}

export function mergeUnifiedVocabEntries(
  platform: readonly PrimaryVocabularySearchIndexEntry[],
  teacher: readonly TeacherLexiconEntry[],
): UnifiedVocabSearchEntry[] {
  return [
    // Promoted teacher rows are represented by their platform `pv_*` entry.
    ...teacher
      .filter((e) => !e.archivedAt && !e.promotedToId)
      .map(teacherEntryToUnified),
    ...platform.map(platformEntryToUnified),
  ];
}

export function searchUnifiedVocab(
  entries: readonly UnifiedVocabSearchEntry[],
  filters: UnifiedVocabSearchFilters = {},
  options?: { limit?: number },
): UnifiedVocabSearchEntry[] {
  const pos = asArray(filters.pos);
  const stages = asArray(filters.primaryStageCandidate);
  const topics = asArray(filters.primaryTopic);
  const kinds = asArray(filters.entryKind);
  const q = filters.query?.trim().toLowerCase() ?? "";
  const source = filters.source ?? "all";
  const readyFilter = filters.readyForClass ?? "all";
  const limit = options?.limit;
  const out: UnifiedVocabSearchEntry[] = [];

  for (const entry of entries) {
    if (source !== "all" && entry.source !== source) continue;
    if (readyFilter === "ready") {
      if (entry.source !== "teacher" || !entry.readyForClass) continue;
    } else if (readyFilter === "draft") {
      if (entry.source !== "teacher" || entry.readyForClass) continue;
    }
    if (q && !matchesUnifiedQuery(entry, q)) continue;
    if (pos && pos.length > 0) {
      if (!pos.includes(entry.pos)) continue;
    }
    if (stages && stages.length > 0) {
      if (!entry.primaryStageCandidate || !stages.includes(entry.primaryStageCandidate)) continue;
    }
    if (topics && topics.length > 0) {
      if (!entry.primaryTopic || !topics.includes(entry.primaryTopic)) continue;
    }
    if (kinds && kinds.length > 0) {
      if (!entry.entryKind || !kinds.includes(entry.entryKind)) continue;
    }
    out.push(entry);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

/** Free-text match across lemma + metadata tags (topic, lane, stage, POS, defs). */
function matchesUnifiedQuery(entry: UnifiedVocabSearchEntry, q: string): boolean {
  const haystacks: string[] = [
    entry.lemma,
    entry.normalizedLemma,
    entry.id,
    entry.pos,
    entry.primaryStageCandidate,
    entry.cefrBandCandidate,
    entry.primaryTopic,
    entry.vocabularyLane,
    entry.entryKind ?? "",
    entry.note ?? "",
    entry.definitionEn ?? "",
    entry.definitionVi ?? "",
    ...entry.topics,
  ];

  return haystacks.some((raw) => {
    if (!raw) return false;
    const value = raw.toLowerCase();
    if (value.includes(q)) return true;
    // "animals" ↔ "animal", "food drink" ↔ "food_drink"
    const spaced = value.replace(/[_-]+/g, " ");
    if (spaced.includes(q)) return true;
    const collapsed = spaced.replace(/\s+/g, "");
    const qCollapsed = q.replace(/[\s_-]+/g, "");
    return qCollapsed.length >= 2 && collapsed.includes(qCollapsed);
  });
}

export function collectUnifiedVocabFacets(entries: readonly UnifiedVocabSearchEntry[]): {
  pos: string[];
  primaryStageCandidate: string[];
  primaryTopic: string[];
} {
  const pos = new Set<string>();
  const stages = new Set<string>();
  const topics = new Set<string>();
  for (const e of entries) {
    if (e.pos) pos.add(e.pos);
    if (e.primaryStageCandidate) stages.add(e.primaryStageCandidate);
    if (e.primaryTopic) topics.add(e.primaryTopic);
  }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return {
    pos: sort(pos),
    primaryStageCandidate: sort(stages),
    primaryTopic: sort(topics),
  };
}

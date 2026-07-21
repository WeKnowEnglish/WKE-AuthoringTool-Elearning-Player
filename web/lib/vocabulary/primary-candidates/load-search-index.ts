import searchIndexJson from "@/content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json";
import type {
  PrimaryVocabularySearchIndex,
  PrimaryVocabularySearchIndexEntry,
} from "./types";

let cachedIndex: PrimaryVocabularySearchIndex | null = null;
let cachedById: Map<string, PrimaryVocabularySearchIndexEntry> | null = null;

function assertSearchIndex(raw: unknown): PrimaryVocabularySearchIndex {
  const data = raw as PrimaryVocabularySearchIndex;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.entries)) {
    throw new Error("Invalid primary vocabulary search index");
  }
  if (data.entryCount !== data.entries.length) {
    throw new Error(
      `Primary vocabulary search index entryCount mismatch: ${data.entryCount} vs ${data.entries.length}`,
    );
  }
  return data;
}

/** Load the slim search index (preferred for teacher UI). Cached after first call. */
export function getPrimaryVocabularySearchIndex(): PrimaryVocabularySearchIndex {
  if (cachedIndex) return cachedIndex;
  cachedIndex = assertSearchIndex(searchIndexJson);
  return cachedIndex;
}

export function getPrimaryVocabularySearchEntries(): readonly PrimaryVocabularySearchIndexEntry[] {
  return getPrimaryVocabularySearchIndex().entries;
}

export function getPrimaryVocabularySearchEntryById(
  id: string,
): PrimaryVocabularySearchIndexEntry | undefined {
  if (!cachedById) {
    cachedById = new Map(
      getPrimaryVocabularySearchEntries().map((entry) => [entry.id, entry]),
    );
  }
  return cachedById.get(id);
}

/** Test helper — clears module caches. */
export function resetPrimaryVocabularySearchIndexCacheForTests(): void {
  cachedIndex = null;
  cachedById = null;
}

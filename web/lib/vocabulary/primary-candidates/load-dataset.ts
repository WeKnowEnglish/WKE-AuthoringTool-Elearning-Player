import candidatesJson from "@/content/vocabulary/reference/primary-candidates/data/primary-vocabulary-candidates.v1.json";
import type {
  PrimaryVocabularyCandidateDataset,
  VocabularyCandidateEntry,
} from "./types";

let cachedDataset: PrimaryVocabularyCandidateDataset | null = null;
let cachedById: Map<string, VocabularyCandidateEntry> | null = null;

function assertDataset(raw: unknown): PrimaryVocabularyCandidateDataset {
  const data = raw as PrimaryVocabularyCandidateDataset;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.entries)) {
    throw new Error("Invalid primary vocabulary candidate dataset");
  }
  if (data.entryCount !== data.entries.length) {
    throw new Error(
      `Primary vocabulary candidate entryCount mismatch: ${data.entryCount} vs ${data.entries.length}`,
    );
  }
  return data;
}

/**
 * Full candidate dataset. Prefer the slim search index for list/filter UI.
 * Use this for detail panels or pack enrichment after IDs are chosen.
 */
export function getPrimaryVocabularyCandidateDataset(): PrimaryVocabularyCandidateDataset {
  if (cachedDataset) return cachedDataset;
  cachedDataset = assertDataset(candidatesJson);
  return cachedDataset;
}

export function getPrimaryVocabularyCandidateById(
  id: string,
): VocabularyCandidateEntry | undefined {
  if (!cachedById) {
    cachedById = new Map(
      getPrimaryVocabularyCandidateDataset().entries.map((entry) => [entry.id, entry]),
    );
  }
  return cachedById.get(id);
}

export function getPrimaryVocabularyCandidatesByIds(
  ids: readonly string[],
): VocabularyCandidateEntry[] {
  const out: VocabularyCandidateEntry[] = [];
  for (const id of ids) {
    const entry = getPrimaryVocabularyCandidateById(id);
    if (entry) out.push(entry);
  }
  return out;
}

/** Test helper — clears module caches. */
export function resetPrimaryVocabularyCandidateCacheForTests(): void {
  cachedDataset = null;
  cachedById = null;
}

/**
 * Runtime accessors for Secondary wordItemId → Primary lexicon (pv_*) map.
 */
import mapJson from "@/content/vocabulary/reference/secondary-lexicon/secondary-to-primary-lexicon-map.v1.json";
import type {
  SecondaryLexiconMappedEntry,
  SecondaryLexiconReviewEntry,
  SecondaryToPrimaryLexiconMapDataset,
} from "@/lib/secondary/secondary-lexicon-map-types";

const dataset = mapJson as SecondaryToPrimaryLexiconMapDataset;

let byWordItemId: Map<string, SecondaryLexiconMappedEntry> | null = null;

function mappingIndex(): Map<string, SecondaryLexiconMappedEntry> {
  if (!byWordItemId) {
    byWordItemId = new Map(dataset.mappings.map((row) => [row.wordItemId, row]));
  }
  return byWordItemId;
}

export function getSecondaryLexiconMapDataset(): SecondaryToPrimaryLexiconMapDataset {
  return dataset;
}

export function getSecondaryLexiconMapCounts(): SecondaryToPrimaryLexiconMapDataset["counts"] {
  return dataset.counts;
}

/** High-confidence mapped lexicon id, or null if not yet mapped. */
export function getSecondaryLexiconId(wordItemId: string): string | null {
  const row = mappingIndex().get(wordItemId.trim());
  return row?.lexiconId ?? null;
}

export function getSecondaryLexiconMapping(
  wordItemId: string,
): SecondaryLexiconMappedEntry | null {
  return mappingIndex().get(wordItemId.trim()) ?? null;
}

export function listSecondaryLexiconMappings(): readonly SecondaryLexiconMappedEntry[] {
  return dataset.mappings;
}

export function listSecondaryLexiconReviewQueue(): readonly SecondaryLexiconReviewEntry[] {
  return dataset.reviewQueue;
}

export function listSecondaryLexiconUnmapped(): readonly SecondaryLexiconReviewEntry[] {
  return dataset.unmapped;
}

/** Mastery / evidence key helper: prefer lexicon id when mapped, else wordItemId. */
export function secondaryEvidenceWordKey(wordItemId: string): {
  wordItemId: string;
  lexiconId: string | null;
  /** Lexicon id when mapped; otherwise the Secondary wordItemId. */
  preferredKey: string;
} {
  const id = wordItemId.trim();
  const lexiconId = getSecondaryLexiconId(id);
  return {
    wordItemId: id,
    lexiconId,
    preferredKey: lexiconId ?? id,
  };
}

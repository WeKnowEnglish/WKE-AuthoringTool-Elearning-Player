/**
 * Secondary mastery dual-key helpers: wordItemId (legacy) ↔ pv_* (lexicon).
 */
import { learningTargetKey } from "@/lib/mastery/engine";
import { getMasteryRecordForTarget } from "@/lib/mastery/local-storage";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  getSecondaryLexiconId,
  listSecondaryLexiconMappings,
  secondaryEvidenceWordKey,
} from "@/lib/secondary/secondary-lexicon-map";

export type SecondaryMasteryWordKeys = {
  wordItemId: string;
  lexiconId: string | null;
  /** Prefer lexicon id for shared dictionary identity when mapped. */
  preferredKey: string;
  /** Unique keys to write on each evidence event (legacy + lexicon when both). */
  writeKeys: string[];
};

export function resolveSecondaryMasteryWordKeys(wordItemId: string): SecondaryMasteryWordKeys {
  const base = secondaryEvidenceWordKey(wordItemId);
  const writeKeys =
    base.lexiconId && base.lexiconId !== base.wordItemId
      ? [base.wordItemId, base.lexiconId]
      : [base.wordItemId];
  return {
    wordItemId: base.wordItemId,
    lexiconId: base.lexiconId,
    preferredKey: base.preferredKey,
    writeKeys,
  };
}

/** Pick the stronger / more practiced record when aliases both exist. */
export function pickBestMasteryRecord(
  records: Array<StudentMasteryRecord | null | undefined>,
): StudentMasteryRecord | null {
  let best: StudentMasteryRecord | null = null;
  for (const record of records) {
    if (!record) continue;
    if (!best) {
      best = record;
      continue;
    }
    if (record.masteryScore !== best.masteryScore) {
      if (record.masteryScore > best.masteryScore) best = record;
      continue;
    }
    if (record.exposureCount !== best.exposureCount) {
      if (record.exposureCount > best.exposureCount) best = record;
      continue;
    }
    const a = record.updatedAt ?? "";
    const b = best.updatedAt ?? "";
    if (a > b) best = record;
  }
  return best;
}

export function secondaryMasteryTargetKeys(wordItemId: string): string[] {
  return resolveSecondaryMasteryWordKeys(wordItemId).writeKeys.map((key) =>
    learningTargetKey({ type: "word", key }),
  );
}

/**
 * Resolve platform mastery for a Secondary word, accepting either legacy or lexicon key.
 */
export function getMasteryRecordForSecondaryWord(
  wordItemId: string,
  masteryRecords?: Record<string, StudentMasteryRecord>,
): StudentMasteryRecord | null {
  const keys = resolveSecondaryMasteryWordKeys(wordItemId);
  if (masteryRecords) {
    return pickBestMasteryRecord(
      keys.writeKeys.map((key) => masteryRecords[learningTargetKey({ type: "word", key })]),
    );
  }
  return pickBestMasteryRecord(
    keys.writeKeys.map((key) => getMasteryRecordForTarget({ type: "word", key })),
  );
}

let lexiconToWordItemId: Map<string, string> | null = null;

function reverseIndex(): Map<string, string> {
  if (!lexiconToWordItemId) {
    lexiconToWordItemId = new Map();
    for (const row of listSecondaryLexiconMappings()) {
      if (!lexiconToWordItemId.has(row.lexiconId)) {
        lexiconToWordItemId.set(row.lexiconId, row.wordItemId);
      }
    }
  }
  return lexiconToWordItemId;
}

/** Reverse lookup for labels: pv_* → first Secondary wordItemId (if any). */
export function getSecondaryWordItemIdForLexiconId(lexiconId: string): string | null {
  return reverseIndex().get(lexiconId.trim()) ?? null;
}

export { getSecondaryLexiconId };

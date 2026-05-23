import { MASTER_VOCABULARY, type VocabularyEntry } from "@/lib/curated-sentences/master-vocabulary";
import type { WordDisplayInfo } from "./types";

const BY_ID = new Map<string, VocabularyEntry>(
  MASTER_VOCABULARY.entries.map((e) => [e.id, e]),
);

const BY_LEMMA = new Map<string, VocabularyEntry>();
for (const entry of MASTER_VOCABULARY.entries) {
  const key = entry.lemma.trim().toLowerCase();
  if (!BY_LEMMA.has(key)) BY_LEMMA.set(key, entry);
}

export function getVocabularyEntryById(wordId: string): VocabularyEntry | undefined {
  return BY_ID.get(wordId.trim().toLowerCase());
}

export function lookupWordIdFromLemma(lemma: string): string | null {
  const key = lemma.trim().toLowerCase();
  if (!key) return null;
  const entry = BY_LEMMA.get(key);
  return entry?.id ?? null;
}

export function getWordDisplayInfo(wordId: string): WordDisplayInfo {
  const id = wordId.trim().toLowerCase();
  const entry = BY_ID.get(id);
  if (entry) {
    return {
      wordId: id,
      lemma: entry.lemma,
      displayLabel: entry.display_label ?? entry.lemma,
      pos: entry.pos,
    };
  }
  return {
    wordId: id,
    lemma: id,
    displayLabel: id,
  };
}

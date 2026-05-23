import { getVocabularyEntryById } from "@/lib/word-collection/catalog";

/** Ensure every id exists in master vocabulary (throws at registry load). */
export function assertExploreWordIds(ids: string[], context: string): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    if (!getVocabularyEntryById(id)) {
      throw new Error(`${context}: unknown word id "${raw}"`);
    }
    seen.add(id);
    normalized.push(id);
  }
  if (normalized.length === 0) {
    throw new Error(`${context}: discoveryWordIds must not be empty`);
  }
  return normalized;
}

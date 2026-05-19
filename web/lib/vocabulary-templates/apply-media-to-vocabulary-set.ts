import type { VocabSetId, VocabularySetDefinition } from "./types";

/** Merge resolved library URLs into a vocabulary set (keeps placeholders when no hit). */
export function applyMediaToVocabularySet(
  def: VocabularySetDefinition,
  urlsByWordId: Readonly<Record<string, string | null | undefined>>,
  coverUrl?: string | null,
): VocabularySetDefinition {
  const nextCover = coverUrl?.trim();
  return {
    ...def,
    coverImageUrl: nextCover || def.coverImageUrl,
    words: def.words.map((w) => {
      const resolved = urlsByWordId[w.id]?.trim();
      return resolved ? { ...w, imageUrl: resolved } : w;
    }),
  };
}

export type VocabularySetMediaResult = {
  setId: VocabSetId;
  urlsByWordId: Record<string, string | null>;
  coverUrl: string | null;
};

import { A1_BREAKFAST_FOOD } from "./sets/a1-breakfast-food";
import type { VocabSetId, VocabularySetDefinition } from "./types";
import { isVocabSetId } from "./types";

export const VOCAB_SET_MENU: { id: VocabSetId; label: string }[] = [
  { id: "breakfast_food", label: "Breakfast Food" },
];

const SETS: Record<VocabSetId, VocabularySetDefinition> = {
  breakfast_food: A1_BREAKFAST_FOOD,
};

export function getVocabularySet(id: VocabSetId): VocabularySetDefinition {
  return SETS[id];
}

export function tryGetVocabularySet(id: string): VocabularySetDefinition | null {
  if (!isVocabSetId(id)) return null;
  return SETS[id];
}

export function vocabSetCoverImageSrc(setId: VocabSetId): string {
  return getVocabularySet(setId).coverImageUrl;
}

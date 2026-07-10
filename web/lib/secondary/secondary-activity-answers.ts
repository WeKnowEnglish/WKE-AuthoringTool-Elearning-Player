import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

export function normalizeSecondaryTypedAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function spellingAnswerCandidates(item: SecondaryVocabItem): string[] {
  return [item.word, item.lemma]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeSecondaryTypedAnswer);
}

export function isSecondarySpellingAnswerCorrect(
  item: SecondaryVocabItem,
  answer: string,
): boolean {
  const normalized = normalizeSecondaryTypedAnswer(answer);
  return spellingAnswerCandidates(item).includes(normalized);
}

export function isSecondaryClozeAnswerCorrect(wordItemId: string, answer: string): boolean {
  const item = getSecondaryVocabItemById(wordItemId);
  if (!item) return false;
  return isSecondarySpellingAnswerCorrect(item, answer);
}

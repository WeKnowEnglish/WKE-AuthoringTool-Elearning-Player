import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export const SECONDARY_CLOZE_MAX_DISTRACTORS = 8;

const LATIN_WORD_PATTERN = /^[a-z'-]+$/i;

function normalizeWord(word: string): string {
  return word.trim();
}

function isLatinWord(word: string): boolean {
  return LATIN_WORD_PATTERN.test(word);
}

function addWord(
  pool: string[],
  seen: Set<string>,
  correct: Set<string>,
  word: string,
): void {
  const normalized = normalizeWord(word);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (correct.has(key)) return;
  if (seen.has(key)) return;
  if (!isLatinWord(normalized)) return;
  seen.add(key);
  pool.push(normalized);
}

/**
 * Distractors come only from the student's current session word list
 * (words not already used as blanks). No pack-level relatedWords / distractors.
 */
export function buildClozeDistractorPool(input: {
  picked: SecondaryVocabItem[];
  sessionPool: SecondaryVocabItem[];
}): string[] {
  const correct = new Set(input.picked.map((item) => item.word.toLowerCase()));
  const pickedIds = new Set(input.picked.map((item) => item.wordItemId));
  const pool: string[] = [];
  const seen = new Set<string>();

  for (const item of input.sessionPool) {
    if (pickedIds.has(item.wordItemId)) continue;
    addWord(pool, seen, correct, item.word);
  }

  return pool
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .slice(0, SECONDARY_CLOZE_MAX_DISTRACTORS);
}

/** Shuffles correct answers with distractors for the visible word bank. */
export function buildSecondaryClozeWordBank(input: {
  blankWordItemIds: string[];
  distractorWords: string[];
  seed: string;
}): string[] {
  const answerWords = input.blankWordItemIds
    .map((wordItemId) => getSecondaryVocabItemById(wordItemId)?.word)
    .filter((word): word is string => Boolean(word));

  const words = Array.from(new Set([...answerWords, ...input.distractorWords]));
  return shuffleWithSeed(words, `${input.seed}:word-bank`);
}

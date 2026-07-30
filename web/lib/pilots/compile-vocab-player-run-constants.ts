/** Shared Vocab Player run sizing (kept separate to avoid import cycles). */
export const VOCAB_PLAYER_SAMPLE_SIZE = 6;
export const VOCAB_PLAYER_LESSON_ID_PREFIX = "vocab-player";

/**
 * Fixed spine for sampleSize words:
 * 1 flashcards + N letter + 1 line_match + N mc + N listen.
 */
export function expectedVocabPlayerScreenCount(
  sampleSize = VOCAB_PLAYER_SAMPLE_SIZE,
): number {
  return 1 + sampleSize + 1 + sampleSize + sampleSize;
}

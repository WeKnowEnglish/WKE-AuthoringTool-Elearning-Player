/**
 * Sentence scramble tile helpers — keep long lines playable by merging
 * function-word glue into phrase tiles (same idea as live-game craft chunks).
 */

/** Soft cap for student-facing scramble tiles (layout + working memory). */
export const SENTENCE_SCRAMBLE_SOFT_MAX_TILES = 8;

const GLUE_WORDS = new Set(
  [
    "a",
    "an",
    "the",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "and",
    "or",
    "but",
    "with",
    "from",
    "by",
    "as",
    "my",
    "your",
    "his",
    "her",
    "our",
    "their",
    "its",
    "is",
    "are",
    "was",
    "were",
    "am",
    "be",
    "been",
    "being",
    "do",
    "does",
    "did",
    "have",
    "has",
    "had",
    "will",
    "would",
    "can",
    "could",
    "should",
    "may",
    "might",
    "must",
    "i",
    "we",
    "you",
    "he",
    "she",
    "it",
    "they",
    "me",
    "him",
    "them",
    "us",
    "this",
    "that",
    "these",
    "those",
    "not",
    "n't",
    "very",
    "too",
    "so",
    "just",
    "also",
    "every",
    "each",
    "some",
    "any",
    "no",
    "more",
    "most",
    "much",
    "many",
  ].map((w) => w.toLowerCase()),
);

function tileCore(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
}

function isGlueToken(token: string): boolean {
  const core = tileCore(token);
  if (!core) return false;
  if (GLUE_WORDS.has(core)) return true;
  // Clitics / contracted glue: "I'm", "don't"
  if (core.includes("'") && core.length <= 6) return true;
  return false;
}

function mergeScore(left: string, right: string): number {
  // Higher = better merge candidate when we must shrink tile count.
  let score = 0;
  if (isGlueToken(left)) score += 8;
  if (isGlueToken(right) && !isGlueToken(left)) score += 2;
  // Prefer merging short tiles.
  score += Math.max(0, 6 - left.length) + Math.max(0, 4 - right.length);
  // Prefer earlier glue (articles / subjects near the start feel natural).
  return score;
}

/**
 * Split a sentence into drag tiles (whitespace).
 * Punctuation stays attached to the adjacent token (e.g. "cat.").
 */
export function tokenizeSentenceForScramble(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Merge tokens into fewer phrase tiles when a sentence is too long to scramble well.
 * Idempotent for already-short lists. Never returns fewer than 2 tiles when input has 2+.
 */
export function chunkTokensForSentenceScramble(
  tokens: readonly string[],
  maxTiles: number = SENTENCE_SCRAMBLE_SOFT_MAX_TILES,
): string[] {
  const cleaned = tokens.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length <= Math.max(2, maxTiles)) return [...cleaned];

  const next = [...cleaned];
  const limit = Math.max(2, maxTiles);

  while (next.length > limit) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < next.length - 1; i++) {
      const score = mergeScore(next[i]!, next[i + 1]!);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    const merged = `${next[bestIndex]} ${next[bestIndex + 1]}`;
    next.splice(bestIndex, 2, merged);
  }

  return next;
}

/** Tokenize then chunk — preferred entry for free-text → scramble tiles. */
export function scrambleTilesFromSentence(
  sentence: string,
  maxTiles: number = SENTENCE_SCRAMBLE_SOFT_MAX_TILES,
): string[] {
  return chunkTokensForSentenceScramble(tokenizeSentenceForScramble(sentence), maxTiles);
}

/**
 * Ensure drag_sentence bank / slots / order stay a consistent multiset.
 * Fixes legacy packs where sentence_slots length drifted from correct_order.
 */
export function normalizeDragSentenceLists(input: {
  correctOrder: readonly string[];
  wordBank?: readonly string[];
  sentenceSlots?: readonly string[];
}): {
  correct_order: string[];
  word_bank: string[];
  sentence_slots: string[];
} {
  const correct_order = input.correctOrder.map((t) => t.trim()).filter(Boolean);
  const bankSource =
    input.wordBank && input.wordBank.length === correct_order.length
      ? input.wordBank.map((t) => t.trim()).filter(Boolean)
      : [...correct_order];

  // If bank length still mismatches (empty strings filtered), fall back to order.
  const word_bank =
    bankSource.length === correct_order.length ? bankSource : [...correct_order];

  return {
    correct_order,
    word_bank,
    sentence_slots: correct_order.map(() => ""),
  };
}

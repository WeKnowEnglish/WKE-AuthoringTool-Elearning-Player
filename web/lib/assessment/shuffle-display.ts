import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

/**
 * Attempt-stable display order for assessment banks/options.
 * Scoring keys ids, so shuffle never changes answers — only presentation.
 */
export function shuffleAssessmentDisplay<T>(
  items: readonly T[],
  seed: string,
): T[] {
  if (items.length <= 1) return [...items];
  return shuffleWithSeed(items, seed);
}

import { seededRandom } from "@/lib/curated-sentences/quiz-compiler-builders";
import type { ExploreGate } from "@/lib/lesson-schemas";

/** Countdown before the spell sprint timer starts (3, 2, 1). */
export const EXPLORE_GATE_SPRINT_COUNTDOWN_SEC = 3;

export type ExploreSprintWord = {
  id: string;
  target_word: string;
  accepted_words?: string[];
  hint?: string;
};

/** Shuffled cycle of gate words for a spell sprint (repeats if timer allows). */
export function buildGateSpellSprintQueue(
  gates: ExploreGate[],
  seed: string,
): ExploreSprintWord[] {
  const words: ExploreSprintWord[] = gates.map((g) => ({
    id: g.id,
    target_word: g.target_word,
    accepted_words: g.accepted_words,
    hint: g.hint,
  }));
  if (words.length === 0) return [];
  const rand = seededRandom(`${seed}:sprint-queue`);
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export function resolveGateSprintOutcome(
  wordsCorrect: number,
  minWordsToClear = 1,
): "dodge" | "hit" {
  return wordsCorrect >= minWordsToClear ? "dodge" : "hit";
}

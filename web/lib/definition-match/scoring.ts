import type {
  DefinitionMatchPair,
  DefinitionMatchPlayable,
} from "@/lib/definition-match/types";

export type DefinitionMatchScore = {
  correct: number;
  total: number;
};

/**
 * Student answers map definition-slot pair id → placed word pair id.
 * Correct when the same pair id is placed on its own definition.
 */
export function scoreDefinitionMatchAnswers(
  pairs: readonly DefinitionMatchPair[],
  answers: Record<string, string>,
): DefinitionMatchScore {
  const total = pairs.length;
  const correct = pairs.filter((pair) => answers[pair.id] === pair.id).length;
  return { correct, total };
}

export function scoreDefinitionMatchPlayable(
  activity: DefinitionMatchPlayable,
  answers: Record<string, string>,
): DefinitionMatchScore {
  return scoreDefinitionMatchAnswers(activity.pairs, answers);
}

export function isDefinitionMatchMastered(score: DefinitionMatchScore): boolean {
  return score.total > 0 && score.correct === score.total;
}

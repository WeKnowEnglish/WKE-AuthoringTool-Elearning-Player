import type {
  ClozeChoiceGapSegment,
  ClozeChoicePlayable,
  ClozeChoiceSegment,
} from "@/lib/cloze-choice/types";
import { listClozeChoiceGaps } from "@/lib/cloze-choice/types";

export type ClozeChoiceScore = {
  correct: number;
  total: number;
};

/** Student answers map gap id → chosen option text. */
export function scoreClozeChoiceAnswers(
  segments: readonly ClozeChoiceSegment[],
  answers: Record<string, string>,
): ClozeChoiceScore {
  const gaps = listClozeChoiceGaps(segments);
  const total = gaps.length;
  const correct = gaps.filter((gap) => answers[gap.id] === gap.correctAnswer).length;
  return { correct, total };
}

export function scoreClozeChoicePlayable(
  activity: ClozeChoicePlayable,
  answers: Record<string, string>,
): ClozeChoiceScore {
  return scoreClozeChoiceAnswers(activity.segments, answers);
}

export function isClozeChoiceMastered(score: ClozeChoiceScore): boolean {
  return score.total > 0 && score.correct === score.total;
}

export function isClozeChoiceGapCorrect(
  gap: ClozeChoiceGapSegment,
  answer: string | undefined,
): boolean {
  return Boolean(answer) && answer === gap.correctAnswer;
}

import type {
  ClozeOpenGapSegment,
  ClozeOpenPlayable,
  ClozeOpenSegment,
} from "@/lib/cloze-open/types";
import { listClozeOpenGaps } from "@/lib/cloze-open/types";

export type ClozeOpenNormalizationOptions = {
  caseSensitive: boolean;
  punctuationSensitive: boolean;
};

export type ClozeOpenScore = {
  correct: number;
  total: number;
};

/** Normalize typed answers (trim, collapse space; optional punctuation/case). */
export function normalizeOpenClozeAnswer(
  answer: string,
  options: ClozeOpenNormalizationOptions,
): string {
  let value = answer.trim().replace(/\s+/g, " ");
  if (!options.punctuationSensitive) {
    value = value.replace(/[.,!?;:'"()[\]{}]/g, "");
  }
  if (!options.caseSensitive) {
    value = value.toLocaleLowerCase();
  }
  return value;
}

export function isOpenClozeAnswerCorrect(
  answer: string,
  gap: ClozeOpenGapSegment,
  options: ClozeOpenNormalizationOptions,
): boolean {
  const normalized = normalizeOpenClozeAnswer(answer, options);
  return gap.correctAnswers.some(
    (accepted) => normalizeOpenClozeAnswer(accepted, options) === normalized,
  );
}

/** Student answers map gap id → typed text. */
export function scoreClozeOpenAnswers(
  segments: readonly ClozeOpenSegment[],
  answers: Record<string, string>,
  options: ClozeOpenNormalizationOptions,
): ClozeOpenScore {
  const gaps = listClozeOpenGaps(segments);
  const total = gaps.length;
  const correct = gaps.filter((gap) =>
    isOpenClozeAnswerCorrect(answers[gap.id] ?? "", gap, options),
  ).length;
  return { correct, total };
}

export function scoreClozeOpenPlayable(
  activity: ClozeOpenPlayable,
  answers: Record<string, string>,
): ClozeOpenScore {
  return scoreClozeOpenAnswers(activity.segments, answers, {
    caseSensitive: activity.caseSensitive,
    punctuationSensitive: activity.punctuationSensitive,
  });
}

export function isClozeOpenMastered(score: ClozeOpenScore): boolean {
  return score.total > 0 && score.correct === score.total;
}

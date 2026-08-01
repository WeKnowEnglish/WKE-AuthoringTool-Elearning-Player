import type {
  ReadAndAnswerPlayable,
  ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";

export type ReadAndAnswerScore = {
  correct: number;
  total: number;
};

/** Student answers map question id → chosen option id. */
export function scoreReadAndAnswerAnswers(
  questions: readonly ReadAndAnswerQuestion[],
  answers: Record<string, string>,
): ReadAndAnswerScore {
  const total = questions.length;
  const correct = questions.filter(
    (question) => answers[question.id] === question.correctOptionId,
  ).length;
  return { correct, total };
}

export function scoreReadAndAnswerPlayable(
  activity: ReadAndAnswerPlayable,
  answers: Record<string, string>,
): ReadAndAnswerScore {
  return scoreReadAndAnswerAnswers(activity.questions, answers);
}

export function isReadAndAnswerMastered(score: ReadAndAnswerScore): boolean {
  return score.total > 0 && score.correct === score.total;
}

export function isReadAndAnswerQuestionCorrect(
  question: ReadAndAnswerQuestion,
  answer: string | undefined,
): boolean {
  return Boolean(answer) && answer === question.correctOptionId;
}

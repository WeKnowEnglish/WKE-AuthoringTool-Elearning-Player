import type {
  PictureStoryPlayable,
  PictureStoryQuestion,
} from "@/lib/picture-story/types";

export type PictureStoryScore = {
  correct: number;
  total: number;
};

export function normalizePictureStoryAnswer(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:'"]/g, "")
    .toLocaleLowerCase();
}

export function isPictureStoryAnswerCorrect(
  value: string,
  question: PictureStoryQuestion,
): boolean {
  if (question.type === "multiple_choice") {
    return value === question.correctOptionId;
  }
  if (question.type !== "sentence_completion") return false;
  return question.acceptedAnswers.some(
    (answer) =>
      normalizePictureStoryAnswer(answer) === normalizePictureStoryAnswer(value),
  );
}

/** Student answers map question id → option id or typed text. */
export function scorePictureStoryAnswers(
  questions: readonly PictureStoryQuestion[],
  answers: Record<string, string>,
): PictureStoryScore {
  const total = questions.length;
  const correct = questions.filter((question) =>
    isPictureStoryAnswerCorrect(answers[question.id] ?? "", question),
  ).length;
  return { correct, total };
}

export function scorePictureStoryPlayable(
  activity: PictureStoryPlayable,
  answers: Record<string, string>,
): PictureStoryScore {
  return scorePictureStoryAnswers(activity.questions, answers);
}

export function isPictureStoryMastered(score: PictureStoryScore): boolean {
  return score.total > 0 && score.correct === score.total;
}

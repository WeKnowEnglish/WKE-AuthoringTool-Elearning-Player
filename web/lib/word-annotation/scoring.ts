import type {
  WordAnnotationPlayable,
  WordAnnotationRole,
  WordAnnotationSentence,
} from "@/lib/word-annotation/types";

export type WordAnnotationScore = {
  correct: number;
  expected: number;
  incorrect: number;
};

export function scoreWordAnnotationAnswers(
  sentences: readonly WordAnnotationSentence[],
  annotations: Record<string, WordAnnotationRole>,
): WordAnnotationScore {
  let correct = 0;
  let expected = 0;
  let incorrect = 0;
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      const marked = annotations[token.id];
      if (token.role) {
        expected += 1;
        if (marked === token.role) correct += 1;
        else if (marked) incorrect += 1;
      } else if (marked) {
        incorrect += 1;
      }
    }
  }
  return { correct, expected, incorrect };
}

export function scoreWordAnnotationPlayable(
  activity: WordAnnotationPlayable,
  annotations: Record<string, WordAnnotationRole>,
): WordAnnotationScore {
  return scoreWordAnnotationAnswers(activity.sentences, annotations);
}

export function isWordAnnotationMastered(score: WordAnnotationScore): boolean {
  return score.expected > 0 && score.correct === score.expected && score.incorrect === 0;
}

export function countWordAnnotationTargets(
  sentences: readonly WordAnnotationSentence[],
): number {
  return sentences.reduce(
    (sum, sentence) => sum + sentence.tokens.filter((token) => token.role).length,
    0,
  );
}

import type {
  SentenceColumnChallenge,
  SentenceColumnId,
  SentenceColumnsPlayable,
} from "@/lib/sentence-columns/types";

export function scoreSentenceColumnsAnswers(
  challenges: readonly SentenceColumnChallenge[],
  placements: Record<string, SentenceColumnId>,
): { correct: number; total: number } {
  const pieces = challenges.flatMap((challenge) => challenge.pieces);
  return {
    correct: pieces.filter((piece) => placements[piece.id] === piece.columnId).length,
    total: pieces.length,
  };
}

export function scoreSentenceColumnsPlayable(
  activity: SentenceColumnsPlayable,
  placements: Record<string, SentenceColumnId>,
): { correct: number; total: number } {
  return scoreSentenceColumnsAnswers(activity.challenges, placements);
}

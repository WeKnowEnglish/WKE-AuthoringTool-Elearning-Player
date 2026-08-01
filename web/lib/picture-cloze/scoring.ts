/** Normalize student answers for picture cloze comparison. */
export function normalizePictureClozeAnswer(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:'"]/g, "")
    .toLocaleLowerCase();
}

export function isPictureClozeAnswerCorrect(
  value: string,
  acceptedAnswers: string[],
): boolean {
  const normalized = normalizePictureClozeAnswer(value);
  return acceptedAnswers.some(
    (answer) => normalizePictureClozeAnswer(answer) === normalized,
  );
}

export function scorePictureClozeAnswers(
  items: ReadonlyArray<{ id: string; acceptedAnswers: string[] }>,
  answers: Record<string, string>,
): { correct: number; total: number } {
  const total = items.length;
  const correct = items.filter((item) =>
    isPictureClozeAnswerCorrect(answers[item.id] ?? "", item.acceptedAnswers),
  ).length;
  return { correct, total };
}

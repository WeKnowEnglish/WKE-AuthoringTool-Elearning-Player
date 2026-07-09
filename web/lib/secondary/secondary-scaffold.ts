export const SECONDARY_MAX_WRONG_ATTEMPTS = 3;

export type SecondaryWordOutcome =
  | { kind: "pending"; wrongAttempts: number }
  | { kind: "success"; attemptsToSuccess: 1 | 2 | 3 }
  | { kind: "revealed" };

export type SecondaryActivityScoreSummary = {
  firstTry: number;
  secondTry: number;
  thirdTry: number;
  neededHelp: number;
  total: number;
  percentUnderstood: number;
};

export function createPendingOutcomes(wordItemIds: string[]): Record<string, SecondaryWordOutcome> {
  return Object.fromEntries(
    wordItemIds.map((wordItemId) => [wordItemId, { kind: "pending", wrongAttempts: 0 } satisfies SecondaryWordOutcome]),
  );
}

export function isSecondaryWordOutcomeDone(outcome: SecondaryWordOutcome | undefined): boolean {
  return outcome?.kind === "success" || outcome?.kind === "revealed";
}

export function getSecondaryPendingWordIds(
  outcomes: Record<string, SecondaryWordOutcome>,
  wordItemIds: string[],
): string[] {
  return wordItemIds.filter((id) => outcomes[id]?.kind === "pending");
}

export function attemptsToSuccessFromWrongAttempts(wrongAttempts: number): 1 | 2 | 3 {
  const next = wrongAttempts + 1;
  if (next === 1) return 1;
  if (next === 2) return 2;
  return 3;
}

export function buildSecondaryActivityScoreSummary(
  outcomes: Record<string, SecondaryWordOutcome>,
  wordItemIds: string[],
): SecondaryActivityScoreSummary {
  let firstTry = 0;
  let secondTry = 0;
  let thirdTry = 0;
  let neededHelp = 0;

  for (const wordItemId of wordItemIds) {
    const outcome = outcomes[wordItemId];
    if (outcome?.kind === "success") {
      if (outcome.attemptsToSuccess === 1) firstTry += 1;
      else if (outcome.attemptsToSuccess === 2) secondTry += 1;
      else thirdTry += 1;
    } else if (outcome?.kind === "revealed") {
      neededHelp += 1;
    }
  }

  const total = wordItemIds.length;
  const understood = firstTry + secondTry + thirdTry;
  const percentUnderstood = total > 0 ? Math.round((understood / total) * 100) : 0;

  return {
    firstTry,
    secondTry,
    thirdTry,
    neededHelp,
    total,
    percentUnderstood,
  };
}

export function scoreToPercent(correctCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

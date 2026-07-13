export type LiveGameClassProjectProgress = {
  roundsPlayed: number;
  teamEscapes: number;
  lastPlayedAt: string | null;
  lastLearningObjective: string | null;
};

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function normalizeLiveGameClassProjectProgress(
  value: unknown,
): LiveGameClassProjectProgress {
  const progress = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    roundsPlayed: nonNegativeInteger(progress.roundsPlayed),
    teamEscapes: nonNegativeInteger(progress.teamEscapes),
    lastPlayedAt: optionalString(progress.lastPlayedAt),
    lastLearningObjective: optionalString(progress.lastLearningObjective),
  };
}

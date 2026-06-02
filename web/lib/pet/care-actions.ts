import type { PetCareActionId, PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";

export type MeterDelta = Partial<Record<PetMeterId, number>>;

export const PET_CARE_METER_DELTAS: Record<
  Exclude<PetCareActionId, "study">,
  MeterDelta
> = {
  feed: { hunger: 25, happiness: 5 },
  drink: { thirst: 25 },
  play: { happiness: 20, energy: -10 },
  wash: { cleanliness: 30 },
  sleep: { energy: 35, hunger: -5, thirst: -5 },
};

/** Applied when a learn activity is fully completed while study is pending. */
export const STUDY_COMPLETE_METER_DELTAS: MeterDelta = {
  happiness: 10,
  energy: -5,
};

export type DrinkMiniGameResultTier = "good" | "bad";

/** Meter changes after the drink mini-game results screen. */
export const DRINK_MINIGAME_DELTAS: Record<DrinkMiniGameResultTier, MeterDelta> = {
  good: { thirst: 25, happiness: 5 },
  bad: { thirst: -10, happiness: -10 },
};

export type SandwichMiniGameResultTier = "good" | "bad";

/** Meter changes after the sandwich mini-game results screen. */
export const SANDWICH_MINIGAME_DELTAS: Record<SandwichMiniGameResultTier, MeterDelta> = {
  good: { hunger: 25, happiness: 5 },
  bad: { hunger: -5, happiness: -10 },
};

export type ExerciseMiniGameResultTier = "good" | "bad";

/** Meter changes after the exercise ladder mini-game (replaces instant play care). */
export const EXERCISE_MINIGAME_DELTAS: Record<ExerciseMiniGameResultTier, MeterDelta> = {
  good: { happiness: 20, energy: 10 },
  bad: { happiness: -10, energy: -5 },
};

export type ScrabblePlayOutcome = "completed" | "gave_up";

/** Meter changes after the scrabble play mini-game. */
export const SCRABBLE_PLAY_DELTAS: Record<ScrabblePlayOutcome, MeterDelta> = {
  completed: { happiness: 20, energy: -10 },
  gave_up: { happiness: 5, energy: -5 },
};

export type MemoryPlayOutcome = "completed" | "gave_up";

/** Meter changes after the memory match play mini-game. */
export const MEMORY_PLAY_DELTAS: Record<MemoryPlayOutcome, MeterDelta> = {
  completed: { happiness: 20, energy: -10 },
  gave_up: { happiness: 5, energy: -5 },
};

export function clampMeter(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function applyMeterDeltas(
  snapshot: PetSnapshotV1,
  deltas: MeterDelta,
  now: number,
): PetSnapshotV1 {
  const meters = { ...snapshot.meters };
  for (const [key, delta] of Object.entries(deltas) as [PetMeterId, number][]) {
    if (delta === undefined) continue;
    meters[key] = clampMeter(meters[key] + delta);
  }
  return { ...snapshot, meters, lastUpdatedAt: now };
}

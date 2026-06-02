import { buildFixPrompt, type ExerciseFixPrompt } from "@/lib/exercise/exercise-fix-prompts";
import { tileMatches, tilesForScale } from "@/lib/exercise/exercise-tiles";
import {
  pickRandomScale,
  shuffleWords,
  type ExpectedSequence,
  type SuperlativeScaleId,
} from "@/lib/exercise/superlative-scales";

export type ExerciseSession = {
  scaleId: SuperlativeScaleId;
  expectedSequence: ExpectedSequence;
  /** Shuffled word ids for the tray (same six words as the scale). */
  trayOrder: string[];
  tiles: ReturnType<typeof tilesForScale>;
};

export type MainRoundTier = "good" | "ok" | "bad";

export type ExerciseSlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type MainRoundScore = {
  tier: MainRoundTier;
  matchCount: number;
  slotResults: [boolean, boolean, boolean, boolean, boolean, boolean];
  /** Last wrong slot when tier is `ok`. */
  failedSlotIndex?: ExerciseSlotIndex;
};

export type ExerciseSessionPicks = [
  string,
  string,
  string,
  string,
  string,
  string,
];

export type FixRoundTier = "good" | "bad";

export function createExerciseSession(
  random: () => number = Math.random,
): ExerciseSession {
  const scale = pickRandomScale(random);
  const expectedSequence = [...scale.words] as ExpectedSequence;
  const trayOrder = shuffleWords(scale.words, random);
  return {
    scaleId: scale.id,
    expectedSequence,
    trayOrder,
    tiles: tilesForScale(scale),
  };
}

export function scoreSlot(pick: string, expectedWord: string): boolean {
  return tileMatches(pick, expectedWord);
}

/** Highest index where the pick did not match the expected word. */
export function lastFailedSlotIndex(
  slotResults: [boolean, boolean, boolean, boolean, boolean, boolean],
): ExerciseSlotIndex | undefined {
  for (let i = slotResults.length - 1; i >= 0; i--) {
    if (!slotResults[i]) return i as ExerciseSlotIndex;
  }
  return undefined;
}

export function scoreMainRound(
  picks: ExerciseSessionPicks,
  expectedSequence: ExpectedSequence,
): MainRoundScore {
  const slotResults = picks.map((pick, i) =>
    scoreSlot(pick, expectedSequence[i]!),
  ) as [boolean, boolean, boolean, boolean, boolean, boolean];

  const matchCount = slotResults.filter(Boolean).length;

  if (matchCount === 6) {
    return { tier: "good", matchCount, slotResults };
  }
  if (matchCount === 4 || matchCount === 5) {
    const failedSlotIndex = lastFailedSlotIndex(slotResults)!;
    return { tier: "ok", matchCount, slotResults, failedSlotIndex };
  }
  return { tier: "bad", matchCount, slotResults };
}

export function buildFixRoundContext(
  expectedSequence: ExpectedSequence,
  picks: ExerciseSessionPicks,
  failedSlotIndex: ExerciseSlotIndex,
): ExerciseFixPrompt {
  const expectedWord = expectedSequence[failedSlotIndex]!;
  const pickedWord = picks[failedSlotIndex]!;
  return buildFixPrompt({ expectedWord, pickedWord });
}

export function formatSlotRequest(expectedWord: string): {
  line: string;
  speakText: string;
  highlightWord: string;
} {
  const line = `Put ${expectedWord} on the ladder!`;
  return {
    line,
    speakText: line,
    highlightWord: expectedWord,
  };
}

export function scoreFixRound(pick: string, targetWord: string): FixRoundTier {
  return tileMatches(pick, targetWord) ? "good" : "bad";
}

/** Tracks one-time tile use per session (wrong picks stay locked). */
export type ExerciseTileTracker = {
  usedTileIds: ReadonlySet<string>;
};

export function createTileTracker(): ExerciseTileTracker {
  return { usedTileIds: new Set() };
}

export function canPickTile(tracker: ExerciseTileTracker, tileId: string): boolean {
  return !tracker.usedTileIds.has(tileId);
}

export function markTileUsed(
  tracker: ExerciseTileTracker,
  tileId: string,
): ExerciseTileTracker {
  const next = new Set(tracker.usedTileIds);
  next.add(tileId);
  return { usedTileIds: next };
}

export function availableTileIds(
  tracker: ExerciseTileTracker,
  allIds: string[],
): string[] {
  return allIds.filter((id) => canPickTile(tracker, id));
}

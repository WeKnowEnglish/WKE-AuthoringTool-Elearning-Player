import { getMasteryRecordForTarget } from "@/lib/mastery/local-storage";
import type { MasteryState } from "@/lib/mastery/types";
import {
  projectMasteryScoreToLegacyLevel,
  projectPlatformMasteryToSecondaryRecord,
} from "@/lib/secondary/secondary-mastery-bridge";
import { readLegacySecondaryWordProgressRecord } from "@/lib/secondary/secondary-word-progress-legacy";
import type { SecondaryWordProgressRecord, WordMasteryLevel } from "@/lib/secondary/types";

export type SecondaryWordDisplaySnapshot = {
  wordItemId: string;
  masteryScore01: number;
  state: MasteryState;
  legacyLevel: WordMasteryLevel;
  timesSeen: number;
  timesCorrect: number;
  recentAccuracy: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
};

function emptySnapshot(wordItemId: string): SecondaryWordDisplaySnapshot {
  return {
    wordItemId,
    masteryScore01: 0,
    state: "new",
    legacyLevel: 0,
    timesSeen: 0,
    timesCorrect: 0,
    recentAccuracy: 0,
  };
}

/** Platform-first display snapshot for secondary Home / session selection (M5). */
export function getSecondaryWordDisplaySnapshot(
  wordItemId: string,
): SecondaryWordDisplaySnapshot {
  const mastery = getMasteryRecordForTarget({ type: "word", key: wordItemId });

  if (mastery && mastery.exposureCount > 0) {
    const attempts = mastery.retrievalSuccessCount + mastery.retrievalFailureCount;
    return {
      wordItemId,
      masteryScore01: mastery.masteryScore,
      state: mastery.state,
      legacyLevel: projectMasteryScoreToLegacyLevel(mastery.masteryScore),
      timesSeen: mastery.exposureCount,
      timesCorrect: mastery.retrievalSuccessCount,
      recentAccuracy:
        attempts > 0 ? mastery.retrievalSuccessCount / attempts : 0,
      lastPracticedAt: mastery.lastSeenAt ?? undefined,
      nextReviewAt: mastery.nextReviewAt ?? undefined,
    };
  }

  const legacy = readLegacySecondaryWordProgressRecord(wordItemId);
  if (legacy) {
    return {
      wordItemId,
      masteryScore01: legacy.masteryLevel / 5,
      state: legacy.masteryLevel > 0 ? "introduced" : "new",
      legacyLevel: legacy.masteryLevel,
      timesSeen: legacy.timesSeen,
      timesCorrect: legacy.timesCorrect,
      recentAccuracy: legacy.recentAccuracy,
      lastPracticedAt: legacy.lastPracticedAt,
      nextReviewAt: legacy.nextReviewAt,
    };
  }

  return emptySnapshot(wordItemId);
}

export function getSecondaryWordProgressRecordFromDisplay(
  wordItemId: string,
): SecondaryWordProgressRecord {
  const snap = getSecondaryWordDisplaySnapshot(wordItemId);
  return projectPlatformMasteryToSecondaryRecord({
    wordItemId: snap.wordItemId,
    masteryScore01: snap.masteryScore01,
    timesSeen: snap.timesSeen,
    timesCorrect: snap.timesCorrect,
    lastPracticedAt: snap.lastPracticedAt,
    nextReviewAt: snap.nextReviewAt,
  });
}

/** Matches legacy MASTERED_LEVEL_THRESHOLD = 4 (~ masteryScore ≥ 0.75). */
export function isSecondaryWordMastered(snapshot: SecondaryWordDisplaySnapshot): boolean {
  return snapshot.masteryScore01 >= 0.75 || snapshot.legacyLevel >= 4;
}

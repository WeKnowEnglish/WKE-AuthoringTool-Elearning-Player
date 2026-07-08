import { getMasteryRecordForTarget } from "@/lib/mastery/local-storage";
import {
  applyLocalAttemptTransition,
  createInitialLocalActivityWordState,
  getWordsNeedingRepair,
  isActivityLocallyComplete,
} from "@/lib/secondary/local-activity-transitions";
import {
  buildSecondaryActivitySessionId,
  clearLocalActivitySession,
  getLocalActivityWordState,
  readLocalActivityMap,
  upsertLocalActivityWordState,
} from "@/lib/secondary/local-activity-store";
import type { LocalActivityWordState } from "@/lib/secondary/local-activity-types";
import { applySecondaryAttemptToPlatformMastery } from "@/lib/secondary/secondary-mastery-bridge";
import {
  getSecondaryWordDisplaySnapshot,
  getSecondaryWordProgressRecordFromDisplay,
} from "@/lib/secondary/secondary-mastery-display";
import { getSecondaryTodayDateKey } from "@/lib/secondary/secondary-today-session";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import type {
  SecondaryTodayActivityKey,
  SecondaryWordAttempt,
  SecondaryWordProgressRecord,
  WordMasteryLevel,
} from "@/lib/secondary/types";

export { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";

export type SecondaryAttemptResult = {
  progress: SecondaryWordProgressRecord;
  local: LocalActivityWordState | null;
};

function makeNewWordProgress(wordItemId: string): SecondaryWordProgressRecord {
  return {
    wordItemId,
    masteryLevel: 0,
    timesSeen: 0,
    timesCorrect: 0,
    correctStreak: 0,
    recentAccuracy: 0,
    lastPracticedAt: undefined,
    nextReviewAt: new Date().toISOString(),
  };
}

function dateKeyFromAttempt(attempt: SecondaryWordAttempt): string {
  return getSecondaryTodayDateKey(new Date(attempt.attemptedAt));
}

/** Platform-first progress projection for secondary UI (M5). */
export function getSecondaryWordProgressRecord(
  wordItemId: string,
): SecondaryWordProgressRecord | null {
  if (typeof window === "undefined") return null;
  const snap = getSecondaryWordDisplaySnapshot(wordItemId);
  if (snap.timesSeen === 0 && snap.legacyLevel === 0) return null;
  return getSecondaryWordProgressRecordFromDisplay(wordItemId);
}

/** @deprecated M5 — no new writes to legacy 0–5 store. */
export function upsertSecondaryWordProgressRecord(
  _studentId: string,
  _record: SecondaryWordProgressRecord,
): void {
  // Intentionally no-op: platform mastery is the SoT.
}

export function getSecondaryActivitySessionId(
  activityKey: SecondaryTodayActivityKey,
  now = new Date(),
): string {
  return buildSecondaryActivitySessionId(getSecondaryTodayDateKey(now), activityKey);
}

export function getSecondaryLocalActivityStates(
  activityKey: SecondaryTodayActivityKey,
  now = new Date(),
): Record<string, LocalActivityWordState> {
  const studentId = resolveSecondaryStudentId();
  return readLocalActivityMap(studentId, getSecondaryActivitySessionId(activityKey, now));
}

export function clearSecondaryLocalActivitySession(
  activityKey: SecondaryTodayActivityKey,
  now = new Date(),
): void {
  const studentId = resolveSecondaryStudentId();
  clearLocalActivitySession(studentId, getSecondaryActivitySessionId(activityKey, now));
}

export function areSecondaryActivityWordsComplete(
  activityKey: SecondaryTodayActivityKey,
  wordItemIds: string[],
  now = new Date(),
): boolean {
  const states = getSecondaryLocalActivityStates(activityKey, now);
  return isActivityLocallyComplete(wordItemIds, states);
}

export function getSecondaryWordsNeedingRepair(
  activityKey: SecondaryTodayActivityKey,
  wordItemIds: string[],
  now = new Date(),
): string[] {
  const states = getSecondaryLocalActivityStates(activityKey, now);
  return getWordsNeedingRepair(states, wordItemIds);
}

export function recordSecondaryWordAttemptDetailed(
  attempt: SecondaryWordAttempt,
): SecondaryAttemptResult {
  if (typeof window === "undefined") {
    return { progress: makeNewWordProgress(attempt.wordItemId), local: null };
  }

  const studentId = resolveSecondaryStudentId();
  const activitySessionId = buildSecondaryActivitySessionId(
    dateKeyFromAttempt(attempt),
    attempt.activityType,
  );
  const now = new Date(attempt.attemptedAt);
  const display = getSecondaryWordDisplaySnapshot(attempt.wordItemId);

  let localPrevious = getLocalActivityWordState(
    studentId,
    activitySessionId,
    attempt.wordItemId,
  );

  if (!localPrevious) {
    const mastery = getMasteryRecordForTarget({
      type: "word",
      key: attempt.wordItemId,
    });
    localPrevious = createInitialLocalActivityWordState({
      studentId,
      activitySessionId,
      wordItemId: attempt.wordItemId,
      masteryScore01: mastery?.masteryScore ?? display.masteryScore01,
      legacyMasteryLevel: display.legacyLevel,
      now,
    });
  }

  const attemptNumber = localPrevious.attempts + 1;
  const localNext = applyLocalAttemptTransition(localPrevious, attempt.isCorrect, now);
  upsertLocalActivityWordState(localNext);

  const progress = applySecondaryAttemptToPlatformMastery({
    studentId,
    attempt,
    evidenceMeta: {
      firstTry: localPrevious.attempts === 0,
      attempts: attemptNumber,
    },
  });

  return { progress, local: localNext };
}

export function recordSecondaryWordAttempt(
  attempt: SecondaryWordAttempt,
): SecondaryWordProgressRecord {
  return recordSecondaryWordAttemptDetailed(attempt).progress;
}

export function mapMasteryLevelToLabel(level: WordMasteryLevel): string {
  if (level === 0) return "New";
  if (level === 1) return "Seen";
  if (level === 2) return "Recognized";
  if (level === 3) return "Practiced";
  if (level === 4) return "Strong";
  return "Mastered";
}

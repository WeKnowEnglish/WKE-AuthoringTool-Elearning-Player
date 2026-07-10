import {
  buildSecondaryActivitySessionId,
  readLocalActivityMap,
} from "@/lib/secondary/local-activity-store";
import type { LocalWordStatus } from "@/lib/secondary/local-activity-types";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import { isSecondaryWordOutcomeDone } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

export const SECONDARY_ACTIVITY_ATTEMPT_SNAPSHOT_PREFIX =
  "secondary-activity-attempt-v1:";

export type SecondaryActivityAttemptSnapshot = {
  version: 1;
  activityKey: SecondaryTodayActivityKey;
  studentId: string;
  dateKey: string;
  completedAt: string;
  percent: number;
  wordItemIds: string[];
  outcomes: Record<string, SecondaryWordOutcome>;
  match?: {
    lockedSelections: Record<string, string>;
  };
  cloze?: {
    templateId: string;
    replayIndex: number;
    lockedAnswers: Record<string, string>;
  };
  sentence?: {
    sentences: Record<string, string>;
  };
};

function snapshotStorageKey(
  studentId: string,
  dateKey: string,
  activityKey: SecondaryTodayActivityKey,
): string {
  return `${SECONDARY_ACTIVITY_ATTEMPT_SNAPSHOT_PREFIX}${studentId}:${dateKey}:${activityKey}`;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function outcomeFromLocalStatus(status: LocalWordStatus): SecondaryWordOutcome | null {
  switch (status) {
    case "passed":
    case "correct":
    case "repaired":
      return { kind: "success", attemptsToSuccess: 1 };
    case "revealed":
      return { kind: "revealed" };
    case "pending_review":
      return { kind: "submitted" };
    default:
      return null;
  }
}

export function getSecondaryActivityAttemptSnapshot(
  activityKey: SecondaryTodayActivityKey,
  studentId: string,
  dateKey: string,
): SecondaryActivityAttemptSnapshot | null {
  if (!canUseLocalStorage() || !studentId || !dateKey) return null;

  try {
    const raw = localStorage.getItem(snapshotStorageKey(studentId, dateKey, activityKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SecondaryActivityAttemptSnapshot;
    if (parsed.version !== 1 || parsed.activityKey !== activityKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSecondaryActivityAttemptSnapshot(
  snapshot: SecondaryActivityAttemptSnapshot,
): void {
  if (!canUseLocalStorage()) return;

  try {
    localStorage.setItem(
      snapshotStorageKey(snapshot.studentId, snapshot.dateKey, snapshot.activityKey),
      JSON.stringify(snapshot),
    );
  } catch {
    // ignore quota
  }
}

export function clearSecondaryActivityAttemptSnapshot(
  activityKey: SecondaryTodayActivityKey,
  studentId: string,
  dateKey: string,
): void {
  if (!canUseLocalStorage() || !studentId || !dateKey) return;

  try {
    localStorage.removeItem(snapshotStorageKey(studentId, dateKey, activityKey));
  } catch {
    // ignore
  }
}

export function hasSecondaryActivityAttemptSnapshot(
  activityKey: SecondaryTodayActivityKey,
  studentId: string,
  dateKey: string,
): boolean {
  return getSecondaryActivityAttemptSnapshot(activityKey, studentId, dateKey) !== null;
}

/** True when the student has a saved snapshot or marked completion for today. */
export function hasSecondaryActivityAttempt(
  activityKey: SecondaryTodayActivityKey,
  studentId: string,
  dateKey: string,
  completionCompleted: boolean,
): boolean {
  if (completionCompleted) return true;
  if (!studentId || !dateKey) return false;
  return hasSecondaryActivityAttemptSnapshot(activityKey, studentId, dateKey);
}

export function buildFallbackActivityOutcomesFromLocal(
  activityKey: SecondaryTodayActivityKey,
  studentId: string,
  dateKey: string,
  wordItemIds: string[],
): Record<string, SecondaryWordOutcome> | null {
  if (!studentId || !dateKey || wordItemIds.length === 0) return null;

  const activitySessionId = buildSecondaryActivitySessionId(dateKey, activityKey);
  const map = readLocalActivityMap(studentId, activitySessionId);
  const outcomes: Record<string, SecondaryWordOutcome> = {};

  for (const wordItemId of wordItemIds) {
    const state = map[wordItemId];
    if (!state) return null;
    const outcome = outcomeFromLocalStatus(state.status);
    if (!outcome) return null;
    outcomes[wordItemId] = outcome;
  }

  const allDone = wordItemIds.every((id) => isSecondaryWordOutcomeDone(outcomes[id]));
  return allDone ? outcomes : null;
}

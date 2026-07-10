import type { LocalActivityWordState, LocalWordStatus } from "@/lib/secondary/local-activity-types";
import {
  LOCAL_CORRECT_DELTA,
  LOCAL_INCORRECT_DELTA,
} from "@/lib/secondary/local-activity-types";
import type { WordMasteryLevel } from "@/lib/secondary/types";

/** One correct answer resolves a word for today's activity session. */
const SESSION_RESOLVED_SUCCESSFUL_ATTEMPTS = 1;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getRequiredSuccessfulAttempts(_input?: {
  masteryScore01?: number;
  legacyMasteryLevel?: WordMasteryLevel;
}): 1 {
  return SESSION_RESOLVED_SUCCESSFUL_ATTEMPTS;
}

export function isLocalWordResolved(state: LocalActivityWordState): boolean {
  if (state.status === "passed" || state.status === "revealed" || state.status === "pending_review") {
    return true;
  }
  if (
    (state.status === "repaired" || state.status === "correct") &&
    state.successfulAttempts >= SESSION_RESOLVED_SUCCESSFUL_ATTEMPTS
  ) {
    return true;
  }
  return false;
}

export function createInitialLocalActivityWordState(params: {
  studentId: string;
  activitySessionId: string;
  wordItemId: string;
  masteryScore01: number;
  legacyMasteryLevel?: WordMasteryLevel;
  now?: Date;
}): LocalActivityWordState {
  const now = params.now ?? new Date();
  return {
    studentId: params.studentId,
    activitySessionId: params.activitySessionId,
    wordItemId: params.wordItemId,
    localMasteryScore: clamp01(params.masteryScore01),
    attempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    requiredSuccessfulAttempts: getRequiredSuccessfulAttempts({
      masteryScore01: params.masteryScore01,
      legacyMasteryLevel: params.legacyMasteryLevel,
    }),
    successfulAttempts: 0,
    status: "not_seen",
    updatedAt: now.toISOString(),
  };
}

export function applyLocalRevealTransition(
  previous: LocalActivityWordState,
  now = new Date(),
): LocalActivityWordState {
  return {
    ...previous,
    status: "revealed",
    updatedAt: now.toISOString(),
  };
}

export function applyLocalSentenceSubmitTransition(
  previous: LocalActivityWordState,
  now = new Date(),
): LocalActivityWordState {
  return {
    ...previous,
    attempts: previous.attempts + 1,
    status: "pending_review",
    updatedAt: now.toISOString(),
  };
}

export function detectWasRepaired(
  previous: LocalActivityWordState,
  wasCorrect: boolean,
): boolean {
  if (!wasCorrect) return false;
  return previous.status === "needs_repair" || previous.status === "incorrect";
}

export function applyLocalAttemptTransition(
  previous: LocalActivityWordState,
  wasCorrect: boolean,
  now = new Date(),
): LocalActivityWordState {
  const localMasteryScore = clamp01(
    previous.localMasteryScore + (wasCorrect ? LOCAL_CORRECT_DELTA : LOCAL_INCORRECT_DELTA),
  );

  const attempts = previous.attempts + 1;
  const correctAttempts = previous.correctAttempts + (wasCorrect ? 1 : 0);
  const incorrectAttempts = previous.incorrectAttempts + (wasCorrect ? 0 : 1);
  const successfulAttempts = wasCorrect
    ? previous.successfulAttempts + 1
    : previous.successfulAttempts;

  let status: LocalWordStatus;

  if (!wasCorrect) {
    status = "needs_repair";
  } else {
    const wasRepair =
      previous.status === "needs_repair" || previous.status === "incorrect";
    if (successfulAttempts >= SESSION_RESOLVED_SUCCESSFUL_ATTEMPTS) {
      status = "passed";
    } else if (wasRepair) {
      status = "repaired";
    } else {
      status = "correct";
    }
  }

  return {
    ...previous,
    localMasteryScore,
    attempts,
    correctAttempts,
    incorrectAttempts,
    successfulAttempts,
    status,
    updatedAt: now.toISOString(),
  };
}

export function getWordsNeedingRepair(
  states: Record<string, LocalActivityWordState>,
  wordItemIds: string[],
): string[] {
  return wordItemIds.filter((id) => {
    const state = states[id];
    if (!state) return true;
    return !isLocalWordResolved(state);
  });
}

export function isActivityLocallyComplete(
  wordItemIds: string[],
  states: Record<string, LocalActivityWordState>,
): boolean {
  if (wordItemIds.length === 0) return true;
  return wordItemIds.every((id) => {
    const state = states[id];
    return state ? isLocalWordResolved(state) : false;
  });
}

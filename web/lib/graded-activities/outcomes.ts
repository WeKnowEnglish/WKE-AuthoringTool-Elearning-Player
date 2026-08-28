import {
  GRADED_ACTIVITY_OUTCOME_VERSION,
  type GradedActivityAttemptEvent,
  type GradedActivityResponse,
  type GradedActivityRunResult,
  type GradedActivityScreenOutcome,
} from "@/lib/graded-activities/types";

type ScreenIdentity = {
  screenId: string;
  screenType: string;
  payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveGradedScreenIdentity(screen: ScreenIdentity): {
  partId: string;
  itemId: string;
  format: string;
} {
  const payload = isRecord(screen.payload) ? screen.payload : {};
  return {
    partId:
      nonEmptyString(payload.grading_part_id) ??
      nonEmptyString(payload.source_beat_id) ??
      screen.screenId,
    itemId:
      nonEmptyString(payload.grading_item_id) ??
      nonEmptyString(payload.item_id) ??
      screen.screenId,
    format:
      nonEmptyString(payload.subtype) ??
      nonEmptyString(payload.type) ??
      screen.screenType,
  };
}

export function appendGradedActivityAttempt(input: {
  lessonId: string;
  screen: ScreenIdentity;
  current?: GradedActivityScreenOutcome;
  response?: GradedActivityResponse;
  passed: boolean;
  occurredAt?: string;
}): {
  event: GradedActivityAttemptEvent;
  outcome: GradedActivityScreenOutcome;
} {
  const identity = resolveGradedScreenIdentity(input.screen);
  const attempts = input.current?.attempts ?? [];
  const event: GradedActivityAttemptEvent = {
    version: GRADED_ACTIVITY_OUTCOME_VERSION,
    lessonId: input.lessonId,
    screenId: input.screen.screenId,
    ...identity,
    response: input.response ?? null,
    passed: input.passed,
    attemptNumber: attempts.length + 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
  return {
    event,
    outcome: {
      passed: Boolean(input.current?.passed || input.passed),
      wrongAttempts:
        (input.current?.wrongAttempts ?? 0) + (input.passed ? 0 : 1),
      attempts: [...attempts, event],
    },
  };
}

export function buildGradedActivityRunResult(input: {
  lessonId: string;
  outcomes: Record<string, GradedActivityScreenOutcome>;
  completedAt?: string;
}): GradedActivityRunResult {
  const screenOutcomes = Object.values(input.outcomes);
  return {
    version: GRADED_ACTIVITY_OUTCOME_VERSION,
    lessonId: input.lessonId,
    completedAt: input.completedAt ?? new Date().toISOString(),
    attempts: screenOutcomes.flatMap((outcome) => outcome.attempts ?? []),
    summary: {
      itemCount: screenOutcomes.length,
      completedCount: screenOutcomes.filter((outcome) => outcome.passed).length,
      firstTryCorrect: screenOutcomes.filter(
        (outcome) => outcome.passed && outcome.wrongAttempts === 0,
      ).length,
      retries: screenOutcomes.reduce(
        (total, outcome) => total + outcome.wrongAttempts,
        0,
      ),
    },
  };
}

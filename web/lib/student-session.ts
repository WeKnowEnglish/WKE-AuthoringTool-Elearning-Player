"use client";

import type { LearningLoopPhaseEvent } from "@/lib/learning-loop";
import { markLessonComplete } from "@/lib/progress/local-storage";
import {
  awardRewardsWithMeta,
  type RewardsSnapshot,
} from "@/lib/progress/rewards";

export const STUDENT_SESSION_EVENTS_STORAGE_KEY = "wke-student-session-events-v1";

export type StudentActivityKind =
  | "vocabulary_set"
  | "grammar_poster"
  | "course_lesson"
  | "explore_run"
  | "pet_minigame"
  | "activity_library_item";

export type StudentActivitySource =
  | "student_hub"
  | "course"
  | "quest"
  | "pet"
  | "collection"
  | "direct_link";

export type StudentResponseKind =
  | "tap"
  | "drag"
  | "type"
  | "speak"
  | "listen"
  | "match"
  | "other";

export type StudentPracticeSummary = {
  practiceItemCount?: number;
  firstTryGraded?: number;
  firstTryCorrect?: number;
  firstTryAccuracyPercent?: number;
  masteredCount?: number;
  reviewItemIds?: string[];
  elapsedMs?: number;
  goldAwarded?: number;
  experienceAwarded?: number;
};

export type StudentPracticeSessionEvent =
  | LearningLoopPhaseEvent
  | {
      type: "session_started";
      sessionId: string;
      activityId: string;
      activityKind: StudentActivityKind;
      source: StudentActivitySource;
      startedAt: string;
      languageTargets?: string[];
      durationEstimateSec?: number;
      scaffoldingLevel?: "high" | "medium" | "low";
    }
  | {
      type: "attempt_recorded";
      sessionId: string;
      targetId?: string;
      success: boolean;
      responseKind?: StudentResponseKind;
      attemptsForTarget?: number;
      recordedAt: string;
    }
  | {
      type: "hint_used";
      sessionId: string;
      targetId?: string;
      hintLevel?: number;
      recordedAt: string;
    }
  | {
      type: "reward_awarded";
      sessionId: string;
      eventId: string;
      goldDelta: number;
      experienceDelta: number;
      recordedAt: string;
    }
  | {
      type: "session_completed";
      sessionId: string;
      completedAt: string;
      result: "completed" | "exited" | "replayed";
      summary: StudentPracticeSummary;
    };

export type StartStudentPracticeSessionInput = {
  activityId: string;
  activityKind: StudentActivityKind;
  source: StudentActivitySource;
  seed?: string | null;
  startedAt?: Date;
  languageTargets?: string[];
  durationEstimateSec?: number;
  scaffoldingLevel?: "high" | "medium" | "low";
};

const MAX_STORED_EVENTS = 500;

function compactIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function createStudentPracticeSessionId(input: {
  activityId: string;
  seed?: string | null;
  startedAt?: Date;
}): string {
  const activity = compactIdPart(input.activityId) || "activity";
  const seed = compactIdPart(input.seed ?? "");
  if (seed) return `${activity}:${seed}`;
  const stamp = (input.startedAt ?? new Date()).toISOString();
  return `${activity}:${stamp}`;
}

export function createStudentPracticeSessionStartedEvent(
  input: StartStudentPracticeSessionInput,
): Extract<StudentPracticeSessionEvent, { type: "session_started" }> {
  const startedAt = input.startedAt ?? new Date();
  return {
    type: "session_started",
    sessionId: createStudentPracticeSessionId({
      activityId: input.activityId,
      seed: input.seed,
      startedAt,
    }),
    activityId: input.activityId,
    activityKind: input.activityKind,
    source: input.source,
    startedAt: startedAt.toISOString(),
    languageTargets: input.languageTargets?.filter(Boolean),
    durationEstimateSec: input.durationEstimateSec,
    scaffoldingLevel: input.scaffoldingLevel,
  };
}

export function createAttemptRecordedEvent(input: {
  sessionId: string;
  success: boolean;
  targetId?: string | null;
  responseKind?: StudentResponseKind;
  attemptsForTarget?: number;
  recordedAt?: Date;
}): Extract<StudentPracticeSessionEvent, { type: "attempt_recorded" }> {
  return {
    type: "attempt_recorded",
    sessionId: input.sessionId,
    targetId: input.targetId?.trim() || undefined,
    success: input.success,
    responseKind: input.responseKind,
    attemptsForTarget: input.attemptsForTarget,
    recordedAt: (input.recordedAt ?? new Date()).toISOString(),
  };
}

export function createRewardAwardedEvent(input: {
  sessionId: string;
  eventId: string;
  goldDelta: number;
  experienceDelta: number;
  recordedAt?: Date;
}): Extract<StudentPracticeSessionEvent, { type: "reward_awarded" }> {
  return {
    type: "reward_awarded",
    sessionId: input.sessionId,
    eventId: input.eventId,
    goldDelta: Math.max(0, input.goldDelta),
    experienceDelta: Math.max(0, input.experienceDelta),
    recordedAt: (input.recordedAt ?? new Date()).toISOString(),
  };
}

export function createSessionCompletedEvent(input: {
  sessionId: string;
  result: "completed" | "exited" | "replayed";
  summary: StudentPracticeSummary;
  completedAt?: Date;
}): Extract<StudentPracticeSessionEvent, { type: "session_completed" }> {
  return {
    type: "session_completed",
    sessionId: input.sessionId,
    completedAt: (input.completedAt ?? new Date()).toISOString(),
    result: input.result,
    summary: {
      ...input.summary,
      reviewItemIds: input.summary.reviewItemIds?.filter(Boolean),
    },
  };
}

export function readStudentPracticeSessionEvents(): StudentPracticeSessionEvent[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STUDENT_SESSION_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StudentPracticeSessionEvent[]) : [];
  } catch {
    return [];
  }
}

export function readPracticeSessionEventsForSession(
  sessionId: string,
): StudentPracticeSessionEvent[] {
  return readStudentPracticeSessionEvents().filter((event) => {
    if (!("sessionId" in event) || typeof event.sessionId !== "string") return false;
    return event.sessionId === sessionId;
  });
}

export function isPracticeSessionTerminal(sessionId: string): boolean {
  return readPracticeSessionEventsForSession(sessionId).some(
    (event) => event.type === "session_completed",
  );
}

export function hasPracticeSessionStarted(sessionId: string): boolean {
  return readPracticeSessionEventsForSession(sessionId).some(
    (event) => event.type === "session_started",
  );
}

type PracticeEventListener = (event: StudentPracticeSessionEvent) => void;

const practiceEventListeners = new Set<PracticeEventListener>();

function notifyPracticeEventListeners(event: StudentPracticeSessionEvent): void {
  for (const listener of practiceEventListeners) {
    try {
      listener(event);
    } catch {
      // Listeners must not break the practice write path.
    }
  }
}

/** Subscribe to practice events after they are persisted. Returns unsubscribe. */
export function subscribePracticeEvents(listener: PracticeEventListener): () => void {
  practiceEventListeners.add(listener);
  return () => {
    practiceEventListeners.delete(listener);
  };
}

export function recordStudentPracticeSessionEvent(
  event: StudentPracticeSessionEvent,
): StudentPracticeSessionEvent[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const next = [...readStudentPracticeSessionEvents(), event].slice(-MAX_STORED_EVENTS);
  window.localStorage.setItem(STUDENT_SESSION_EVENTS_STORAGE_KEY, JSON.stringify(next));
  notifyPracticeEventListeners(event);
  return next;
}

/** Append a practice event and notify subscribers. Primary write entry for the contract. */
export function emitPracticeEvent(
  event: StudentPracticeSessionEvent,
): StudentPracticeSessionEvent[] {
  return recordStudentPracticeSessionEvent(event);
}

export function startPracticeSession(
  input: StartStudentPracticeSessionInput,
): Extract<StudentPracticeSessionEvent, { type: "session_started" }> {
  const event = createStudentPracticeSessionStartedEvent(input);
  emitPracticeEvent(event);
  return event;
}

export function recordAttempt(
  input: Parameters<typeof createAttemptRecordedEvent>[0],
): Extract<StudentPracticeSessionEvent, { type: "attempt_recorded" }> {
  const event = createAttemptRecordedEvent(input);
  emitPracticeEvent(event);
  return event;
}

export type AwardPracticeRewardResult = {
  snapshot: RewardsSnapshot;
  event: Extract<StudentPracticeSessionEvent, { type: "reward_awarded" }> | null;
  skippedDuplicate: boolean;
};

/**
 * Awards gold/XP through the existing rewards store, then emits `reward_awarded`
 * only when the award was not an idempotent no-op.
 */
export function awardPracticeReward(input: {
  sessionId: string;
  eventId: string;
  goldDelta: number;
  experienceDelta: number;
  recordedAt?: Date;
}): AwardPracticeRewardResult {
  const { snapshot, meta } = awardRewardsWithMeta({
    eventId: input.eventId,
    goldDelta: input.goldDelta,
    experienceDelta: input.experienceDelta,
  });
  if (meta.skippedDuplicate) {
    return { snapshot, event: null, skippedDuplicate: true };
  }
  const event = createRewardAwardedEvent({
    sessionId: input.sessionId,
    eventId: input.eventId,
    goldDelta: input.goldDelta,
    experienceDelta: input.experienceDelta,
    recordedAt: input.recordedAt,
  });
  emitPracticeEvent(event);
  return { snapshot, event, skippedDuplicate: false };
}

export type CompletePracticeSessionInput = {
  sessionId: string;
  result: "completed" | "exited" | "replayed";
  summary: StudentPracticeSummary;
  completedAt?: Date;
  /** When `result` is `completed`, marks this lesson id complete in progress storage. */
  lessonId?: string;
};

/**
 * Emits `session_completed`. Marks the lesson complete only for `result: "completed"`.
 * Does not award rewards — call `awardPracticeReward` first when needed.
 */
export function completePracticeSession(
  input: CompletePracticeSessionInput,
): Extract<StudentPracticeSessionEvent, { type: "session_completed" }> | null {
  if (isPracticeSessionTerminal(input.sessionId)) return null;
  if (input.result === "completed" && input.lessonId) {
    markLessonComplete(input.lessonId);
  }
  const event = createSessionCompletedEvent({
    sessionId: input.sessionId,
    result: input.result,
    summary: input.summary,
    completedAt: input.completedAt,
  });
  emitPracticeEvent(event);
  return event;
}

/**
 * Records `session_completed` with `result: "exited"` when the session started
 * and is not already terminal. No rewards and no lesson completion.
 */
export function exitPracticeSessionIfOpen(input: {
  sessionId: string;
  summary?: StudentPracticeSummary;
  completedAt?: Date;
}): Extract<StudentPracticeSessionEvent, { type: "session_completed" }> | null {
  if (!input.sessionId) return null;
  if (!hasPracticeSessionStarted(input.sessionId)) return null;
  return completePracticeSession({
    sessionId: input.sessionId,
    result: "exited",
    summary: input.summary ?? {},
    completedAt: input.completedAt,
  });
}

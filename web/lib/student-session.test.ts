import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STUDENT_SESSION_EVENTS_STORAGE_KEY,
  createAttemptRecordedEvent,
  createRewardAwardedEvent,
  createSessionCompletedEvent,
  createStudentPracticeSessionStartedEvent,
  readStudentPracticeSessionEvents,
  recordStudentPracticeSessionEvent,
} from "./student-session";

function installMemoryStorage() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage: ls }));
}

describe("student-session", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a stable started event from activity id and seed", () => {
    const event = createStudentPracticeSessionStartedEvent({
      activityId: "vocab-a1-food-fruit",
      activityKind: "vocabulary_set",
      source: "student_hub",
      seed: "run 1",
      startedAt: new Date("2026-07-04T00:00:00.000Z"),
      languageTargets: ["apple", "banana"],
      durationEstimateSec: 360,
      scaffoldingLevel: "medium",
    });

    expect(event.sessionId).toBe("vocab-a1-food-fruit:run-1");
    expect(event.startedAt).toBe("2026-07-04T00:00:00.000Z");
    expect(event.languageTargets).toEqual(["apple", "banana"]);
  });

  it("records events in local storage in order", () => {
    const started = createStudentPracticeSessionStartedEvent({
      activityId: "vocab-a1-food-fruit",
      activityKind: "vocabulary_set",
      source: "student_hub",
      seed: "abc",
      startedAt: new Date("2026-07-04T00:00:00.000Z"),
    });
    const attempt = createAttemptRecordedEvent({
      sessionId: started.sessionId,
      targetId: "apple",
      success: true,
      responseKind: "tap",
      recordedAt: new Date("2026-07-04T00:00:01.000Z"),
    });
    const reward = createRewardAwardedEvent({
      sessionId: started.sessionId,
      eventId: "evt-1",
      goldDelta: 2,
      experienceDelta: 3,
      recordedAt: new Date("2026-07-04T00:00:02.000Z"),
    });
    const complete = createSessionCompletedEvent({
      sessionId: started.sessionId,
      result: "completed",
      completedAt: new Date("2026-07-04T00:00:03.000Z"),
      summary: {
        practiceItemCount: 6,
        firstTryAccuracyPercent: 83,
        reviewItemIds: ["banana"],
      },
    });

    recordStudentPracticeSessionEvent(started);
    recordStudentPracticeSessionEvent(attempt);
    recordStudentPracticeSessionEvent(reward);
    recordStudentPracticeSessionEvent(complete);

    expect(readStudentPracticeSessionEvents().map((e) => e.type)).toEqual([
      "session_started",
      "attempt_recorded",
      "reward_awarded",
      "session_completed",
    ]);
    expect(localStorage.getItem(STUDENT_SESSION_EVENTS_STORAGE_KEY)).toContain("banana");
  });
});


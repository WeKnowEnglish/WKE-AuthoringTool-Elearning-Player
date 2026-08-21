import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetScopedStorageTestState,
  seedScopedRewards,
} from "@/lib/auth/scoped-storage-test-helpers";
import { getRewards } from "./progress/rewards";
import {
  STUDENT_SESSION_EVENTS_STORAGE_KEY,
  awardPracticeReward,
  completePracticeSession,
  createAttemptRecordedEvent,
  createRewardAwardedEvent,
  createSessionCompletedEvent,
  createStudentPracticeSessionStartedEvent,
  exitPracticeSessionIfOpen,
  isPracticeSessionTerminal,
  readStudentPracticeSessionEvents,
  recordStudentPracticeSessionEvent,
  startPracticeSession,
  subscribePracticeEvents,
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
    resetScopedStorageTestState();
    localStorage.clear();
  });

  afterEach(() => {
    resetScopedStorageTestState();
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
    const scopedKey = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .find((key) => key?.startsWith(`${STUDENT_SESSION_EVENTS_STORAGE_KEY}:`));
    expect(scopedKey).toBeTruthy();
    expect(localStorage.getItem(scopedKey!)).toContain("banana");
  });

  it("notifies subscribePracticeEvents listeners after emit", () => {
    const seen: string[] = [];
    const unsubscribe = subscribePracticeEvents((event) => {
      seen.push(event.type);
    });
    startPracticeSession({
      activityId: "vocab-test",
      activityKind: "vocabulary_set",
      source: "student_hub",
      seed: "notify",
    });
    unsubscribe();
    expect(seen).toEqual(["session_started"]);
  });

  it("awardPracticeReward skips duplicate reward events", () => {
    seedScopedRewards({
      rewardedEventIds: ["dup-evt"],
    });
    const { event, skippedDuplicate } = awardPracticeReward({
      sessionId: "vocab-test:seed",
      eventId: "dup-evt",
      goldDelta: 5,
      experienceDelta: 3,
    });
    expect(skippedDuplicate).toBe(true);
    expect(event).toBeNull();
    expect(readStudentPracticeSessionEvents()).toHaveLength(0);
  });

  it("exitPracticeSessionIfOpen records exited when session started", () => {
    const started = startPracticeSession({
      activityId: "vocab-test",
      activityKind: "vocabulary_set",
      source: "student_hub",
      seed: "exit",
    });
    const exited = exitPracticeSessionIfOpen({ sessionId: started.sessionId });
    expect(exited?.result).toBe("exited");
    expect(isPracticeSessionTerminal(started.sessionId)).toBe(true);
    expect(readStudentPracticeSessionEvents().map((e) => e.type)).toEqual([
      "session_started",
      "session_completed",
    ]);
  });

  it("completePracticeSession is idempotent for a terminal session", () => {
    const started = startPracticeSession({
      activityId: "vocab-test",
      activityKind: "vocabulary_set",
      source: "student_hub",
      seed: "once",
    });
    const first = completePracticeSession({
      sessionId: started.sessionId,
      result: "completed",
      summary: { practiceItemCount: 1 },
    });
    const second = completePracticeSession({
      sessionId: started.sessionId,
      result: "completed",
      summary: { practiceItemCount: 1 },
    });
    expect(first?.result).toBe("completed");
    expect(second).toBeNull();
    expect(
      readStudentPracticeSessionEvents().filter((e) => e.type === "session_completed"),
    ).toHaveLength(1);
  });

  it("starts grammar_poster practice sessions", () => {
    const started = startPracticeSession({
      activityId: "short-answers-there-is-a1",
      activityKind: "grammar_poster",
      source: "student_hub",
      seed: "grammar-1",
    });
    expect(started.activityKind).toBe("grammar_poster");
    expect(readStudentPracticeSessionEvents()[0]?.type).toBe("session_started");
  });
});


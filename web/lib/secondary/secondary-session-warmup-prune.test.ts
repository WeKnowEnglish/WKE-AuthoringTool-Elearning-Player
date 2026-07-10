import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import { reconcileSecondarySessionWarmupPrune } from "@/lib/secondary/secondary-session-warmup-prune";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

function masteredRecord(wordId: string): StudentMasteryRecord {
  return {
    targetKey: learningTargetKey({ type: "word", key: wordId }),
    targetType: "word",
    targetId: wordId,
    studentId: "student-a",
    masteryScore: 0.8,
    state: "mastered",
    confidence: 0.8,
    exposureCount: 5,
    retrievalSuccessCount: 4,
    retrievalFailureCount: 1,
    lastPracticedAt: "2026-07-10T00:00:00.000Z",
    nextReviewAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

function session(overrides: Partial<SecondaryTodaySession> = {}): SecondaryTodaySession {
  const warmUpWordItemIds = overrides.warmUpWordItemIds ?? ["w1", "w2"];
  const todayWordItemIds = overrides.todayWordItemIds ?? ["f1", "f2"];
  return {
    dateKey: "2026-07-10",
    warmUpWordItemIds,
    todayWordItemIds,
    allWordItemIds: overrides.allWordItemIds ?? [...warmUpWordItemIds, ...todayWordItemIds],
    ...overrides,
  };
}

describe("secondary-session-warmup-prune", () => {
  it("removes mastered warm-up words from the session and activity pool", () => {
    const records = {
      [learningTargetKey({ type: "word", key: "w1" })]: masteredRecord("w1"),
    };

    const result = reconcileSecondarySessionWarmupPrune({
      session: session(),
      masteryRecords: records,
    });

    expect(result.changed).toBe(true);
    expect(result.removedWordItemIds).toEqual(["w1"]);
    expect(result.session.warmUpWordItemIds).toEqual(["w2"]);
    expect(result.session.allWordItemIds).toEqual(["w2", "f1", "f2"]);
    expect(result.session.todayWordItemIds).toEqual(["f1", "f2"]);
  });

  it("leaves the session unchanged when no warm-up words are mastered", () => {
    const input = session();
    const result = reconcileSecondarySessionWarmupPrune({
      session: input,
      masteryRecords: {},
    });

    expect(result.changed).toBe(false);
    expect(result.removedWordItemIds).toEqual([]);
    expect(result.session).toEqual(input);
  });

  it("can remove all warm-up words when every warm-up is mastered", () => {
    const records = {
      [learningTargetKey({ type: "word", key: "w1" })]: masteredRecord("w1"),
      [learningTargetKey({ type: "word", key: "w2" })]: masteredRecord("w2"),
    };

    const result = reconcileSecondarySessionWarmupPrune({
      session: session(),
      masteryRecords: records,
    });

    expect(result.session.warmUpWordItemIds).toEqual([]);
    expect(result.session.allWordItemIds).toEqual(["f1", "f2"]);
  });
});

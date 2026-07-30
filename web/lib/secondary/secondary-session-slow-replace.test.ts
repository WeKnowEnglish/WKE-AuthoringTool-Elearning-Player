import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  isWordMasteredForSlowReplace,
  reconcileSecondarySessionSlowReplace,
  SLOW_REPLACE_MASTERED_THRESHOLD,
} from "@/lib/secondary/secondary-session-slow-replace";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

const NOW = new Date("2026-07-08T10:00:00.000Z");
const DATE_KEY = "2026-07-08";
const STUDENT = "student-slow-replace";

function wordKey(wordId: string): string {
  return learningTargetKey({ type: "word", key: wordId });
}

function masteredRecord(wordId: string): StudentMasteryRecord {
  const targetKey = wordKey(wordId);
  return {
    studentId: STUDENT,
    targetKey,
    targetType: "word",
    targetLabel: wordId,
    state: "secure",
    masteryScore: 0.9,
    confidence: 0.9,
    exposureCount: 8,
    retrievalSuccessCount: 7,
    retrievalFailureCount: 1,
    firstTrySuccessCount: 6,
    lastSeenAt: "2026-07-08T09:00:00.000Z",
    lastSuccessAt: "2026-07-08T09:30:00.000Z",
    nextReviewAt: "2026-07-15T08:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "low",
    updatedAt: "2026-07-08T09:30:00.000Z",
  };
}

function developingRecord(wordId: string): StudentMasteryRecord {
  const targetKey = wordKey(wordId);
  return {
    studentId: STUDENT,
    targetKey,
    targetType: "word",
    targetLabel: wordId,
    state: "developing",
    masteryScore: 0.35,
    confidence: 0.5,
    exposureCount: 3,
    retrievalSuccessCount: 1,
    retrievalFailureCount: 2,
    firstTrySuccessCount: 1,
    lastSeenAt: "2026-07-07T08:00:00.000Z",
    lastSuccessAt: "2026-07-07T08:00:00.000Z",
    nextReviewAt: "2026-07-10T08:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-07T08:00:00.000Z",
  };
}

function todaySession(todayWordItemIds: string[]): SecondaryTodaySession {
  return {
    dateKey: DATE_KEY,
    warmUpWordItemIds: [],
    todayWordItemIds,
    allWordItemIds: todayWordItemIds,
    selectionVersion: 4,
  };
}

function reconcile(
  session: SecondaryTodaySession,
  candidateWordItemIds: string[],
  masteryRecords: Record<string, StudentMasteryRecord>,
) {
  return reconcileSecondarySessionSlowReplace({
    session,
    candidateWordItemIds,
    masteryRecords,
    studentId: STUDENT,
    now: NOW,
  });
}

describe("secondary-session-slow-replace", () => {
  it("detects mastered words at platform threshold", () => {
    const records = { [wordKey("w1")]: masteredRecord("w1") };
    expect(isWordMasteredForSlowReplace("w1", records)).toBe(true);
    expect(isWordMasteredForSlowReplace("w2", records)).toBe(false);
  });

  it("does not replace when fewer than threshold words are mastered", () => {
    const today = ["w1", "w2", "w3", "w4"];
    const candidates = ["w1", "w2", "w3", "w4", "w5", "w6"];
    const records = {
      [wordKey("w1")]: masteredRecord("w1"),
      [wordKey("w2")]: masteredRecord("w2"),
    };

    const result = reconcile(todaySession(today), candidates, records);

    expect(result.swaps).toHaveLength(0);
    expect(result.session.todayWordItemIds).toEqual(today);
    expect(result.session.masteredOnListOrder).toEqual(["w1", "w2"]);
    expect(result.session.selectionVersion).toBe(4);
  });

  it("FIFO-evicts the earliest mastered word when threshold is reached", () => {
    const today = ["w1", "w2", "w3", "w4"];
    const candidates = ["w1", "w2", "w3", "w4", "w5", "w6"];
    const records = {
      [wordKey("w1")]: masteredRecord("w1"),
      [wordKey("w2")]: masteredRecord("w2"),
      [wordKey("w3")]: masteredRecord("w3"),
      [wordKey("w5")]: developingRecord("w5"),
    };

    const result = reconcile(todaySession(today), candidates, records);

    expect(result.swaps).toHaveLength(1);
    expect(result.swaps[0]).toEqual({ outWordItemId: "w1", inWordItemId: "w5" });
    expect(result.session.todayWordItemIds).toEqual(["w5", "w2", "w3", "w4"]);
    expect(result.session.replacedOutWordItemIds).toEqual(["w1"]);
    expect(result.session.introducedWordItemIds).toEqual(["w5"]);
    expect(result.session.masteredOnListOrder).toEqual(["w2", "w3"]);
  });

  it("evicts multiple times when many words are mastered and replacements exist", () => {
    const today = ["w1", "w2", "w3", "w4", "w5"];
    const candidates = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"];
    const records = {
      [wordKey("w1")]: masteredRecord("w1"),
      [wordKey("w2")]: masteredRecord("w2"),
      [wordKey("w3")]: masteredRecord("w3"),
      [wordKey("w4")]: masteredRecord("w4"),
      [wordKey("w5")]: masteredRecord("w5"),
      [wordKey("w6")]: developingRecord("w6"),
      [wordKey("w7")]: developingRecord("w7"),
    };

    const result = reconcile(todaySession(today), candidates, records);

    expect(result.swaps.length).toBeGreaterThanOrEqual(2);
    expect(result.swaps[0]?.outWordItemId).toBe("w1");
    expect(result.swaps[1]?.outWordItemId).toBe("w2");
    expect(result.session.todayWordItemIds).not.toContain("w1");
    expect(result.session.todayWordItemIds).not.toContain("w2");
    expect(result.session.masteredOnListOrder?.length).toBeLessThan(
      SLOW_REPLACE_MASTERED_THRESHOLD,
    );
  });

  it("keeps the list unchanged when no replacement candidates are available", () => {
    const today = ["w1", "w2", "w3"];
    const candidates = ["w1", "w2", "w3"];
    const records = {
      [wordKey("w1")]: masteredRecord("w1"),
      [wordKey("w2")]: masteredRecord("w2"),
      [wordKey("w3")]: masteredRecord("w3"),
    };

    const result = reconcile(todaySession(today), candidates, records);

    expect(result.swaps).toHaveLength(0);
    expect(result.session.todayWordItemIds).toEqual(today);
    expect(result.session.masteredOnListOrder).toEqual(["w1", "w2", "w3"]);
  });

  it("does not re-pick words already replaced out today", () => {
    const session: SecondaryTodaySession = {
      dateKey: DATE_KEY,
      warmUpWordItemIds: [],
      todayWordItemIds: ["w5", "w2", "w3", "w4"],
      allWordItemIds: ["w5", "w2", "w3", "w4"],
      selectionVersion: 4,
      masteredOnListOrder: ["w2", "w3"],
      replacedOutWordItemIds: ["w1"],
    };
    const candidates = ["w1", "w2", "w3", "w4", "w5", "w6"];
    const records = {
      [wordKey("w2")]: masteredRecord("w2"),
      [wordKey("w3")]: masteredRecord("w3"),
      [wordKey("w4")]: masteredRecord("w4"),
      [wordKey("w6")]: developingRecord("w6"),
    };

    const result = reconcile(session, candidates, records);

    expect(result.swaps).toHaveLength(1);
    expect(result.swaps[0]?.outWordItemId).toBe("w2");
    expect(result.swaps[0]?.inWordItemId).toBe("w6");
    expect(result.swaps[0]?.inWordItemId).not.toBe("w1");
  });
});

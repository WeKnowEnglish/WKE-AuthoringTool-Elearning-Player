import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  countWordsPerTopic,
  SECONDARY_MAX_WORDS_PER_TOPIC,
  topicIdForWordItem,
} from "@/lib/secondary/secondary-selection-s2";
import {
  DEFAULT_SECONDARY_SELECTION_QUOTAS,
  SECONDARY_SELECTION_VERSION,
  selectSecondaryTodayWords,
  TARGET_TODAY_WORDS,
} from "@/lib/secondary/secondary-session-selection";
import {
  getAllSecondaryWordItemIds,
  SECONDARY_VOCAB_PACK_ITEM_COUNT,
} from "@/lib/secondary/secondary-vocab-bank";

const NOW = new Date("2026-07-04T08:00:00.000Z");
const DATE_KEY = "2026-07-04";
const STUDENT_A = "student-full-pack-a";
const STUDENT_B = "student-full-pack-b";

function record(
  wordId: string,
  overrides: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  const targetKey = learningTargetKey({ type: "word", key: wordId });
  return {
    studentId: STUDENT_A,
    targetKey,
    targetType: "word",
    targetLabel: wordId,
    state: "introduced",
    masteryScore: 0.3,
    confidence: 0.5,
    exposureCount: 2,
    retrievalSuccessCount: 1,
    retrievalFailureCount: 1,
    firstTrySuccessCount: 1,
    lastSeenAt: "2026-07-01T08:00:00.000Z",
    lastSuccessAt: "2026-07-01T08:00:00.000Z",
    nextReviewAt: "2026-07-10T08:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("secondary-session-selection full pack (240 words)", () => {
  const candidateWordItemIds = getAllSecondaryWordItemIds();

  it("uses the complete A2 bank as candidates", () => {
    expect(candidateWordItemIds.length).toBe(SECONDARY_VOCAB_PACK_ITEM_COUNT);
  });

  it("selects a bounded today list with topic spread and stretch on empty mastery", () => {
    const result = selectSecondaryTodayWords({
      candidateWordItemIds,
      studentId: STUDENT_A,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [],
      masteryRecords: {},
    });

    expect(result.todayWordItemIds.length).toBeLessThanOrEqual(
      DEFAULT_SECONDARY_SELECTION_QUOTAS.targetTodayWords,
    );
    expect(result.todayWordItemIds.length).toBeGreaterThan(0);

    const topicCounts = countWordsPerTopic(result.todayWordItemIds);
    for (const count of topicCounts.values()) {
      expect(count).toBeLessThanOrEqual(SECONDARY_MAX_WORDS_PER_TOPIC);
    }

    const stretchCount = result.todayWordItemIds.filter(
      (id) => result.reasons?.[id] === "stretch",
    ).length;
    expect(stretchCount).toBeLessThanOrEqual(1);
  });

  it("is deterministic for the same student, date, and empty mastery", () => {
    const input = {
      candidateWordItemIds,
      studentId: STUDENT_A,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [] as string[],
      masteryRecords: {},
    };

    const first = selectSecondaryTodayWords(input);
    const second = selectSecondaryTodayWords(input);
    expect(second).toEqual(first);
  });

  it("uses different refresh streams per student id on the full bank", () => {
    const masteryRecords: Record<string, StudentMasteryRecord> = {};
    for (const wordId of candidateWordItemIds) {
      masteryRecords[learningTargetKey({ type: "word", key: wordId })] = record(wordId, {
        state: "secure",
        masteryScore: 0.5,
        confidence: 0.8,
        nextReviewAt: "2026-07-10T08:00:00.000Z",
      });
    }

    const resultA = selectSecondaryTodayWords({
      candidateWordItemIds,
      masteryRecords,
      studentId: STUDENT_A,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [],
    });
    const resultB = selectSecondaryTodayWords({
      candidateWordItemIds,
      masteryRecords,
      studentId: STUDENT_B,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [],
    });

    const refreshA = resultA.todayWordItemIds.find((id) => resultA.reasons?.[id] === "refresh");
    const refreshB = resultB.todayWordItemIds.find((id) => resultB.reasons?.[id] === "refresh");
    expect(refreshA).toBeTruthy();
    expect(refreshB).toBeTruthy();
    expect(refreshA).not.toBe(refreshB);
  });

  it("prefers due words for returning students on the full bank", () => {
    const dueWords = candidateWordItemIds.slice(0, 6);
    const masteryRecords: Record<string, StudentMasteryRecord> = {};
    for (const wordId of dueWords) {
      masteryRecords[learningTargetKey({ type: "word", key: wordId })] = record(wordId, {
        nextReviewAt: "2026-07-03T08:00:00.000Z",
        masteryScore: 0.2,
        state: "needs_review",
      });
    }

    const result = selectSecondaryTodayWords({
      candidateWordItemIds,
      masteryRecords,
      studentId: STUDENT_A,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [],
    });

    const dueInToday = result.todayWordItemIds.filter((id) => dueWords.includes(id));
    expect(dueInToday.length).toBeGreaterThanOrEqual(3);
  });

  it("exports selection version 3 for S2 rules", () => {
    expect(SECONDARY_SELECTION_VERSION).toBe(3);
    expect(TARGET_TODAY_WORDS).toBe(10);
  });

  it("keeps all today words in known topics", () => {
    const result = selectSecondaryTodayWords({
      candidateWordItemIds,
      studentId: STUDENT_A,
      dateKey: DATE_KEY,
      now: NOW,
      clozeBlankIds: [],
      masteryRecords: {},
    });

    for (const wordItemId of result.todayWordItemIds) {
      expect(topicIdForWordItem(wordItemId)).not.toBe("unknown");
    }
  });
});

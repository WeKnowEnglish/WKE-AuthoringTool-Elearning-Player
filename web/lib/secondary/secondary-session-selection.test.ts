import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  DEFAULT_SECONDARY_SELECTION_QUOTAS,
  selectSecondaryTodayWords,
} from "@/lib/secondary/secondary-session-selection";

const NOW = new Date("2026-07-04T08:00:00.000Z");
const DATE_KEY = "2026-07-04";
const STUDENT_A = "student-a";
const STUDENT_B = "student-b";

function wordKey(wordId: string): string {
  return learningTargetKey({ type: "word", key: wordId });
}

function record(
  wordId: string,
  overrides: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  const targetKey = wordKey(wordId);
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

function select(input: {
  candidateWordItemIds: string[];
  masteryRecords?: Record<string, StudentMasteryRecord>;
  clozeBlankIds?: string[];
  studentId?: string;
  dateKey?: string;
  now?: Date;
}) {
  return selectSecondaryTodayWords({
    candidateWordItemIds: input.candidateWordItemIds,
    studentId: input.studentId ?? STUDENT_A,
    dateKey: input.dateKey ?? DATE_KEY,
    now: input.now ?? NOW,
    clozeBlankIds: input.clozeBlankIds ?? [],
    masteryRecords: input.masteryRecords ?? {},
  });
}

describe("secondary-session-selection", () => {
  it("returns empty session for empty bank", () => {
    const result = select({ candidateWordItemIds: [] });
    expect(result).toEqual({
      warmUpWordItemIds: [],
      todayWordItemIds: [],
      allWordItemIds: [],
    });
  });

  it("selects mostly new words when mastery is empty", () => {
    const ids = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "w10", "w11", "w12"];
    const result = select({ candidateWordItemIds: ids });

    expect(result.warmUpWordItemIds).toEqual([]);
    expect(result.todayWordItemIds.length).toBeLessThanOrEqual(
      DEFAULT_SECONDARY_SELECTION_QUOTAS.targetTodayWords,
    );
    expect(result.todayWordItemIds.every((id) => result.reasons?.[id] === "new")).toBe(true);
    expect(result.allWordItemIds.length).toBeGreaterThan(0);
  });

  it("fills due quota before fragile words in today list", () => {
    const dueWords = ["due-1", "due-2", "due-3", "due-4", "due-5"];
    const fragileWords = ["frag-1", "frag-2", "frag-3", "frag-4", "frag-5"];
    const masteryRecords: Record<string, StudentMasteryRecord> = {};

    for (const wordId of dueWords) {
      masteryRecords[wordKey(wordId)] = record(wordId, {
        state: "developing",
        nextReviewAt: "2026-07-03T08:00:00.000Z",
        masteryScore: 0.2,
      });
    }
    for (const wordId of fragileWords) {
      masteryRecords[wordKey(wordId)] = record(wordId, {
        state: "needs_review",
        nextReviewAt: "2026-07-10T08:00:00.000Z",
        masteryScore: 0.25,
      });
    }

    const result = select({
      candidateWordItemIds: [...dueWords, ...fragileWords],
      masteryRecords,
    });

    const dueInSession = result.allWordItemIds.filter((id) => dueWords.includes(id));
    const fragileInToday = result.todayWordItemIds.filter((id) => fragileWords.includes(id));

    expect(dueInSession.length).toBeGreaterThanOrEqual(DEFAULT_SECONDARY_SELECTION_QUOTAS.dueQuota);
    expect(fragileInToday.length).toBeGreaterThan(0);
    expect(result.todayWordItemIds.indexOf("due-1")).toBeLessThan(
      result.todayWordItemIds.indexOf("frag-1"),
    );
  });

  it("excludes mastered words unless cloze force-include applies", () => {
    const masteryRecords = {
      [wordKey("mastered-due")]: record("mastered-due", {
        masteryScore: 0.9,
        state: "secure",
        nextReviewAt: "2026-07-03T08:00:00.000Z",
      }),
      [wordKey("active-due")]: record("active-due", {
        masteryScore: 0.3,
        nextReviewAt: "2026-07-03T08:00:00.000Z",
      }),
    };

    const withoutCloze = select({
      candidateWordItemIds: ["mastered-due", "active-due", "w-new"],
      masteryRecords,
    });
    expect(withoutCloze.allWordItemIds).not.toContain("mastered-due");
    expect(withoutCloze.allWordItemIds).toContain("active-due");

    const withCloze = select({
      candidateWordItemIds: ["mastered-due", "active-due"],
      masteryRecords,
      clozeBlankIds: ["mastered-due"],
    });
    expect(withCloze.todayWordItemIds).toContain("mastered-due");
    expect(withCloze.reasons?.["mastered-due"]).toBe("cloze_include");
  });

  it("is deterministic for the same student, date, and fixtures", () => {
    const candidateWordItemIds = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"];
    const masteryRecords = {
      [wordKey("w1")]: record("w1", {
        nextReviewAt: "2026-07-03T08:00:00.000Z",
        exposureCount: 4,
      }),
      [wordKey("w2")]: record("w2", { state: "stuck", exposureCount: 3 }),
      [wordKey("w3")]: record("w3", {
        state: "secure",
        masteryScore: 0.5,
        nextReviewAt: "2026-07-10T08:00:00.000Z",
      }),
    };

    const first = select({ candidateWordItemIds, masteryRecords });
    const second = select({ candidateWordItemIds, masteryRecords });
    expect(second).toEqual(first);
  });

  it("uses different refresh shuffle streams per student id", () => {
    const refreshWords = ["r1", "r2", "r3", "r4", "r5", "r6"];
    const masteryRecords: Record<string, StudentMasteryRecord> = {};
    for (const wordId of refreshWords) {
      masteryRecords[wordKey(wordId)] = record(wordId, {
        state: "secure",
        masteryScore: 0.5,
        confidence: 0.8,
        nextReviewAt: "2026-07-10T08:00:00.000Z",
      });
    }

    const resultA = select({
      candidateWordItemIds: refreshWords,
      masteryRecords,
      studentId: STUDENT_A,
    });
    const resultB = select({
      candidateWordItemIds: refreshWords,
      masteryRecords,
      studentId: STUDENT_B,
    });

    const refreshPickA = resultA.todayWordItemIds.find((id) => resultA.reasons?.[id] === "refresh");
    const refreshPickB = resultB.todayWordItemIds.find((id) => resultB.reasons?.[id] === "refresh");

    expect(refreshPickA).toBeTruthy();
    expect(refreshPickB).toBeTruthy();
    expect(refreshPickA).not.toBe(refreshPickB);
  });

  it("force-includes cloze blanks not already selected", () => {
    const result = select({
      candidateWordItemIds: ["w1", "w2", "cloze-blank"],
      masteryRecords: {
        [wordKey("w1")]: record("w1", {
          nextReviewAt: "2026-07-03T08:00:00.000Z",
        }),
      },
      clozeBlankIds: ["cloze-blank"],
    });

    expect(result.todayWordItemIds).toContain("cloze-blank");
    expect(result.reasons?.["cloze-blank"]).toBe("cloze_include");
  });

  it("falls back to mastered words when every candidate is mastered", () => {
    const candidateWordItemIds = ["m1", "m2", "m3"];
    const masteryRecords = {
      [wordKey("m1")]: record("m1", { masteryScore: 0.92, state: "secure" }),
      [wordKey("m2")]: record("m2", { masteryScore: 0.95, state: "secure" }),
      [wordKey("m3")]: record("m3", { masteryScore: 0.9, state: "secure" }),
    };

    const result = select({ candidateWordItemIds, masteryRecords });
    expect(result.allWordItemIds.length).toBeGreaterThan(0);
    expect(result.todayWordItemIds.length).toBeGreaterThan(0);
  });

  it("pulls warmup from due and fragile words with prior exposure", () => {
    const masteryRecords = {
      [wordKey("due-seen")]: record("due-seen", {
        nextReviewAt: "2026-07-03T08:00:00.000Z",
        exposureCount: 5,
        masteryScore: 0.2,
      }),
      [wordKey("due-unseen")]: record("due-unseen", {
        nextReviewAt: "2026-07-03T08:00:00.000Z",
        exposureCount: 0,
        masteryScore: 0.2,
      }),
      [wordKey("frag-seen")]: record("frag-seen", {
        state: "stuck",
        exposureCount: 4,
        masteryScore: 0.15,
      }),
      [wordKey("new-1")]: record("new-1", { exposureCount: 0 }),
    };

    const result = select({
      candidateWordItemIds: ["due-seen", "due-unseen", "frag-seen", "new-1", "new-2"],
      masteryRecords,
    });

    expect(result.warmUpWordItemIds.length).toBeGreaterThan(0);
    expect(result.warmUpWordItemIds.every((id) => id !== "new-1" && id !== "new-2")).toBe(true);
    expect(result.warmUpWordItemIds).toContain("due-seen");
    expect(result.warmUpWordItemIds).toContain("frag-seen");
    expect(result.warmUpWordItemIds).not.toContain("due-unseen");
  });
});

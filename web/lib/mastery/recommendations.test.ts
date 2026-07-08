import { describe, expect, it } from "vitest";
import {
  classifyWordForPractice,
  recommendVocabularyPracticeWords,
  vocabularyRecommendationReasonLabel,
} from "@/lib/mastery/recommendations";
import type { MasterySnapshot } from "@/lib/mastery/local-storage";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

function record(
  targetKey: string,
  overrides: Partial<StudentMasteryRecord>,
): StudentMasteryRecord {
  return {
    studentId: "student-1",
    targetKey,
    targetType: "word",
    targetLabel: targetKey,
    state: "introduced",
    masteryScore: 0.2,
    confidence: 0.2,
    exposureCount: 1,
    retrievalSuccessCount: 1,
    retrievalFailureCount: 0,
    firstTrySuccessCount: 1,
    lastSeenAt: "2026-07-01T08:00:00.000Z",
    lastSuccessAt: "2026-07-01T08:00:00.000Z",
    nextReviewAt: null,
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-01T08:00:00.000Z",
    ...overrides,
  };
}

function snapshot(records: Record<string, StudentMasteryRecord>): MasterySnapshot {
  return {
    schemaVersion: 1,
    updatedAt: "2026-07-04T08:00:00.000Z",
    records,
  };
}

describe("vocabulary recommendations", () => {
  it("prioritizes due review and fragile words inside the available set", () => {
    const recs = recommendVocabularyPracticeWords({
      words: [{ id: "apple" }, { id: "banana" }, { id: "carrot" }],
      mastery: snapshot({
        "word:apple": record("word:apple", {
          state: "secure",
          masteryScore: 0.8,
          nextReviewAt: "2026-07-03T08:00:00.000Z",
        }),
        "word:banana": record("word:banana", {
          state: "needs_review",
          masteryScore: 0.35,
        }),
        "word:outside-set": record("word:outside-set", {
          state: "stuck",
          masteryScore: 0.1,
        }),
      }),
      now: new Date("2026-07-04T08:00:00.000Z"),
      limit: 2,
    });

    expect(recs.map((rec) => rec.wordId)).toEqual(["apple", "banana"]);
    expect(recs[0]?.reason).toBe("due_review");
    expect(recs[0]?.masteryScore).toBe(0.8);
    expect(recs[0]?.state).toBe("secure");
    expect(recs[1]?.reason).toBe("fragile");
  });

  it("returns no recommendations for new unseen words", () => {
    expect(
      recommendVocabularyPracticeWords({
        words: [{ id: "apple" }],
        mastery: snapshot({}),
      }),
    ).toEqual([]);
  });

  it("formats stable explanation labels", () => {
    expect(vocabularyRecommendationReasonLabel("due_review")).toBe("due review");
    expect(vocabularyRecommendationReasonLabel("low_confidence")).toBe("low confidence");
  });
});

describe("classifyWordForPractice", () => {
  const now = new Date("2026-07-04T08:00:00.000Z");

  it("returns new when record is missing or has zero exposure", () => {
    expect(classifyWordForPractice({ wordId: "apple", record: null, now })).toBe("new");
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", { exposureCount: 0 }),
        now,
      }),
    ).toBe("new");
  });

  it("returns mastered when masteryScore is at threshold and not due", () => {
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", {
          masteryScore: 0.75,
          state: "secure",
          nextReviewAt: "2026-07-10T08:00:00.000Z",
        }),
        now,
      }),
    ).toBe("mastered");
  });

  it("returns due_review before fragile when both apply", () => {
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", {
          state: "needs_review",
          nextReviewAt: "2026-07-03T08:00:00.000Z",
        }),
        now,
      }),
    ).toBe("due_review");
  });

  it("returns fragile for stuck or needs_review when not due", () => {
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", { state: "stuck" }),
        now,
      }),
    ).toBe("fragile");
  });

  it("returns low_confidence for seen words below confidence threshold", () => {
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", { confidence: 0.2, state: "introduced" }),
        now,
      }),
    ).toBe("low_confidence");
  });

  it("returns null for stable seen words eligible for refresh", () => {
    expect(
      classifyWordForPractice({
        wordId: "apple",
        record: record("word:apple", {
          state: "secure",
          masteryScore: 0.5,
          confidence: 0.8,
          nextReviewAt: "2026-07-10T08:00:00.000Z",
        }),
        now,
      }),
    ).toBeNull();
  });
});

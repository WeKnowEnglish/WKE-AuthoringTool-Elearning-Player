import { describe, expect, it } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  buildTeacherStudentMasteryDiagnostic,
  parseWordIdFromTargetKey,
  pickDueReviewTargets,
  pickWeakWordTargets,
  wordRecordFixture,
} from "@/lib/mastery/teacher-mastery-summary";

const studentId = "a1111111-1111-4111-8111-111111111111";

describe("teacher-mastery-summary", () => {
  it("parses word ids from target keys", () => {
    expect(parseWordIdFromTargetKey("word:g7-a2-apple")).toBe("g7-a2-apple");
    expect(parseWordIdFromTargetKey("strand:foo")).toBeNull();
  });

  it("orders weak words by lowest mastery score", () => {
    const records = [
      wordRecordFixture(studentId, "word-high", { masteryScore: 0.8, exposureCount: 2 }),
      wordRecordFixture(studentId, "word-low", { masteryScore: 0.1, exposureCount: 2 }),
      wordRecordFixture(studentId, "word-mid", { masteryScore: 0.4, exposureCount: 2 }),
    ];

    const weak = pickWeakWordTargets(records, 2);
    expect(weak.map((row) => parseWordIdFromTargetKey(row.targetKey))).toEqual([
      "word-low",
      "word-mid",
    ]);
  });

  it("detects due review targets", () => {
    const now = new Date("2026-07-09T12:00:00.000Z");
    const records = [
      wordRecordFixture(studentId, "due-word", {
        nextReviewAt: "2026-07-09T08:00:00.000Z",
        exposureCount: 4,
        masteryScore: 0.5,
      }),
      wordRecordFixture(studentId, "fresh-word", {
        nextReviewAt: "2026-07-10T08:00:00.000Z",
        exposureCount: 4,
        masteryScore: 0.5,
      }),
    ];

    const due = pickDueReviewTargets(records, now, 5);
    expect(due).toHaveLength(1);
    expect(parseWordIdFromTargetKey(due[0]!.targetKey)).toBe("due-word");
    expect(due[0]!.practiceReason).toBe("due_review");
  });

  it("builds an empty diagnostic for students with no records", () => {
    const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, []);
    expect(diagnostic.recordCount).toBe(0);
    expect(diagnostic.weakWords).toEqual([]);
    expect(diagnostic.latestUpdatedAt).toBeNull();
  });

  it("includes grammar weak targets below threshold", () => {
    const grammar = createEmptyMasteryRecord({
      studentId,
      target: { type: "grammar", key: "short-answers-there-is-a1", label: "There is" },
    });
    grammar.masteryScore = 0.3;
    grammar.exposureCount = 2;

    const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, [grammar]);
    expect(diagnostic.grammarWeak).toHaveLength(1);
    expect(diagnostic.grammarWeak[0]?.targetType).toBe("grammar");
  });
});

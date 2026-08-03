import { describe, expect, it } from "vitest";
import { assessLearningStrands } from "@/lib/learning-strands";
import { buildFullStudentDiagnostic } from "@/lib/mastery/teacher-mastery-display";
import { wordRecordFixture } from "@/lib/mastery/teacher-mastery-summary";
import {
  buildParentProgressDraft,
  parentStatusForEvidence,
  parentProgressSnapshotSchema,
} from "@/lib/parent/progress-report";

const now = new Date("2026-08-03T00:00:00.000Z");

describe("parent progress reporting", () => {
  it("does not label a high score strong when evidence is thin", () => {
    expect(
      parentStatusForEvidence({
        masteryScore: 0.98,
        confidence: 0.9,
        evidenceCount: 2,
        successCount: 2,
        firstTrySuccessCount: 2,
        scaffoldingNeeded: "low",
        lastSeenAt: "2026-08-02T00:00:00.000Z",
        now,
      }),
    ).toBe("collecting_evidence");
  });

  it("requires confidence, independence, first-try success, and recency for strong", () => {
    expect(
      parentStatusForEvidence({
        masteryScore: 0.9,
        confidence: 0.8,
        evidenceCount: 8,
        successCount: 7,
        firstTrySuccessCount: 5,
        scaffoldingNeeded: "low",
        lastSeenAt: "2026-08-01T00:00:00.000Z",
        now,
      }),
    ).toBe("strong");
  });

  it("treats stale evidence as evidence still being collected", () => {
    expect(
      parentStatusForEvidence({
        masteryScore: 0.9,
        confidence: 0.8,
        evidenceCount: 10,
        successCount: 9,
        firstTrySuccessCount: 8,
        scaffoldingNeeded: "low",
        lastSeenAt: "2026-04-01T00:00:00.000Z",
        now,
      }),
    ).toBe("collecting_evidence");
  });

  it("creates a valid vocabulary-scoped snapshot without proficiency claims", () => {
    const records = [
      wordRecordFixture("student-1", "apple", {
        masteryScore: 0.9,
        confidence: 0.8,
        exposureCount: 8,
        retrievalSuccessCount: 7,
        firstTrySuccessCount: 5,
        scaffoldingNeeded: "low",
        lastSeenAt: "2026-08-01T00:00:00.000Z",
      }),
    ];
    const diagnostic = buildFullStudentDiagnostic("student-1", records);
    const result = buildParentProgressDraft({
      studentName: "Mina",
      classTitle: "Primary A2",
      records,
      strands: assessLearningStrands({ records: {} }),
      vocabularyRows: diagnostic.vocabularyRows,
      grammarRows: diagnostic.grammarRows,
      now,
    });

    expect(parentProgressSnapshotSchema.safeParse(result.snapshot).success).toBe(true);
    expect(result.snapshot.evidenceScope.label).toBe("Mainly vocabulary evidence");
    expect(result.snapshot.evidenceScope.caveat.toLowerCase()).toContain(
      "does not represent overall english proficiency",
    );
    expect(JSON.stringify(result.snapshot)).not.toMatch(/\b\d{1,3}%\b/);
  });
});

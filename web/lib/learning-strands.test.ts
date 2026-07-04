import { describe, expect, it } from "vitest";
import {
  LEARNING_STRAND_IDS,
  LEARNING_STRANDS,
  STRAND_RUBRIC_LEVELS,
  assessLearningStrand,
  assessLearningStrands,
  inferLearningStrandsForEvidence,
  isLearningStrandId,
  learningStrandTargetRef,
  strandMasteryTargetKey,
  weakestLearningStrands,
  vocabularyStrandsForPractice,
} from "@/lib/learning-strands";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

function strandRecord(
  targetKey: string,
  overrides: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  return {
    studentId: "student-1",
    targetKey,
    targetType: "strand",
    targetLabel: targetKey,
    state: "developing",
    masteryScore: 0.55,
    confidence: 0.5,
    exposureCount: 8,
    retrievalSuccessCount: 5,
    retrievalFailureCount: 3,
    firstTrySuccessCount: 3,
    lastSeenAt: "2026-07-04T08:00:00.000Z",
    lastSuccessAt: "2026-07-04T08:00:00.000Z",
    nextReviewAt: "2026-07-08T08:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-04T08:00:00.000Z",
    ...overrides,
  };
}

describe("learning strands", () => {
  it("defines Nation's four ESL learning strands", () => {
    expect(LEARNING_STRAND_IDS).toEqual([
      "meaning_focused_input",
      "meaning_focused_output",
      "language_focused_learning",
      "fluency_development",
    ]);
    expect(LEARNING_STRANDS.meaning_focused_input.label).toBe("Meaning-Focused Input");
    expect(LEARNING_STRANDS.meaning_focused_output.label).toBe("Meaning-Focused Output");
    expect(LEARNING_STRANDS.language_focused_learning.label).toBe(
      "Language-Focused Learning",
    );
    expect(LEARNING_STRANDS.fluency_development.label).toBe("Fluency Development");
  });

  it("creates strand target refs for mastery tracking", () => {
    expect(learningStrandTargetRef("meaning_focused_input")).toEqual({
      type: "strand",
      key: "meaning_focused_input",
      label: "Meaning-Focused Input",
    });
  });

  it("defines teacher-readable rubric levels", () => {
    expect(STRAND_RUBRIC_LEVELS.emerging.teacherMeaning).toContain("substantial support");
    expect(STRAND_RUBRIC_LEVELS.extending.nextMove).toContain("challenge");
  });

  it("validates strand ids", () => {
    expect(isLearningStrandId("fluency_development")).toBe(true);
    expect(isLearningStrandId("grammar_only")).toBe(false);
  });

  it("infers broad strands from evidence shape", () => {
    expect(
      inferLearningStrandsForEvidence({
        evidenceMode: "recognition",
        responseKind: "tap",
      }),
    ).toEqual(["meaning_focused_input"]);
    expect(
      inferLearningStrandsForEvidence({
        evidenceMode: "production",
        responseKind: "speak",
      }),
    ).toEqual(["meaning_focused_output"]);
    expect(
      inferLearningStrandsForEvidence({
        evidenceMode: "recall",
        responseKind: "type",
        isTimed: true,
      }),
    ).toEqual(["fluency_development"]);
  });

  it("maps vocabulary practice to strand evidence", () => {
    expect(
      vocabularyStrandsForPractice({
        evidenceMode: "recognition",
        responseKind: "tap",
      }),
    ).toEqual(["meaning_focused_input"]);
    expect(
      vocabularyStrandsForPractice({
        evidenceMode: "production",
        responseKind: "type",
      }),
    ).toEqual(["language_focused_learning"]);
  });

  it("assesses a strand record with a rubric level", () => {
    const assessment = assessLearningStrand({
      strandId: "meaning_focused_output",
      record: strandRecord("strand:meaning_focused_output", {
        masteryScore: 0.68,
        confidence: 0.6,
        exposureCount: 6,
        scaffoldingNeeded: "low",
      }),
    });

    expect(assessment.level.id).toBe("secure");
    expect(assessment.strandLabel).toBe("Meaning-Focused Output");
    expect(assessment.scaffoldingNeeded).toBe("low");
  });

  it("requires enough evidence before assigning a performance level", () => {
    const assessment = assessLearningStrand({
      strandId: "fluency_development",
      record: strandRecord("strand:fluency_development", {
        masteryScore: 0.9,
        confidence: 0.1,
        exposureCount: 1,
      }),
    });

    expect(assessment.level.id).toBe("not_enough_evidence");
  });

  it("assesses all four strands and sorts weakest first", () => {
    const assessments = assessLearningStrands({
      records: {
        [strandMasteryTargetKey("meaning_focused_input")]: strandRecord(
          "strand:meaning_focused_input",
          { masteryScore: 0.75 },
        ),
        [strandMasteryTargetKey("meaning_focused_output")]: strandRecord(
          "strand:meaning_focused_output",
          { masteryScore: 0.25 },
        ),
        [strandMasteryTargetKey("language_focused_learning")]: strandRecord(
          "strand:language_focused_learning",
          { masteryScore: 0.55 },
        ),
      },
    });

    expect(assessments).toHaveLength(4);
    expect(weakestLearningStrands(assessments)[0]?.strandId).toBe("fluency_development");
    expect(weakestLearningStrands(assessments)[1]?.strandId).toBe(
      "meaning_focused_output",
    );
  });
});

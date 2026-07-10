import { describe, expect, it } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  buildTeacherProgressNarrative,
  buildVocabularyTableRows,
  teacherAttentionScore,
  buildTeacherStrandAssessments,
  buildGrammarTableRows,
} from "@/lib/mastery/teacher-mastery-display";
import {
  buildTeacherStudentMasteryDiagnostic,
  wordRecordFixture,
} from "@/lib/mastery/teacher-mastery-summary";

const studentId = "a1111111-1111-4111-8111-111111111111";

describe("teacher-mastery-display", () => {
  it("builds strand assessments from records", () => {
    const records = [
      wordRecordFixture(studentId, "word-a", { masteryScore: 0.6, exposureCount: 3 }),
    ];
    const strands = buildTeacherStrandAssessments(records);
    expect(strands).toHaveLength(4);
    expect(strands.every((strand) => strand.strandLabel.length > 0)).toBe(true);
  });

  it("orders vocabulary rows by lowest score", () => {
    const records = [
      wordRecordFixture(studentId, "word-high", { masteryScore: 0.9, exposureCount: 2 }),
      wordRecordFixture(studentId, "word-low", { masteryScore: 0.2, exposureCount: 2 }),
    ];
    const rows = buildVocabularyTableRows(records);
    expect(rows[0]?.wordItemId).toBe("word-low");
  });

  it("builds grammar table rows with labels", () => {
    const grammar = createEmptyMasteryRecord({
      studentId,
      target: { type: "grammar", key: "short-answers-there-is-a1", label: "There is" },
    });
    grammar.masteryScore = 0.3;
    grammar.exposureCount = 2;

    const rows = buildGrammarTableRows([grammar]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("There is");
  });

  it("returns onboarding narrative when no records", () => {
    const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, []);
    const narrative = buildTeacherProgressNarrative({
      diagnostic,
      strands: buildTeacherStrandAssessments([]),
      studentDisplayName: "Mina",
    });
    expect(narrative.summary).toContain("no mastery evidence");
    expect(narrative.actions.length).toBeGreaterThan(0);
  });

  it("mentions due review in narrative when items are due", () => {
    const now = new Date("2026-07-09T12:00:00.000Z");
    const records = [
      wordRecordFixture(studentId, "due-word", {
        nextReviewAt: "2026-07-09T08:00:00.000Z",
        exposureCount: 4,
        masteryScore: 0.5,
      }),
    ];
    const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, records);
    const narrative = buildTeacherProgressNarrative({
      diagnostic,
      strands: buildTeacherStrandAssessments(records),
      studentDisplayName: "Mina",
    });
    expect(narrative.summary).toContain("due");
    expect(narrative.actions.some((action) => action.toLowerCase().includes("review"))).toBe(true);
    expect(now).toBeInstanceOf(Date);
  });

  it("scores attention higher when due review items exist", () => {
    const withDue = teacherAttentionScore({
      dueReviewCount: 2,
      weakWordCount: 1,
      latestUpdatedAt: new Date().toISOString(),
    });
    const withoutDue = teacherAttentionScore({
      dueReviewCount: 0,
      weakWordCount: 1,
      latestUpdatedAt: new Date().toISOString(),
    });
    expect(withDue).toBeGreaterThan(withoutDue);
  });
});

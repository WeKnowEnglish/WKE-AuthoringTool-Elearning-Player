import { describe, expect, it } from "vitest";
import {
  applyTeacherSentenceApprovalToRecords,
  buildTeacherSentenceApprovalEvidence,
} from "@/lib/mastery/teacher-sentence-assessment";
import { learningTargetKey } from "@/lib/mastery/engine";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";

describe("teacher-sentence-assessment", () => {
  it("builds production evidence with teacher_assigned source", () => {
    const evidence = buildTeacherSentenceApprovalEvidence({
      studentId: "student-1",
      submissionId: "sub-1",
      wordItemId: "g7-a2-brave",
      dateKey: "2026-07-10",
      lemma: "brave",
      reviewedAt: new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(evidence.activityId).toBe("secondary:sentence");
    expect(evidence.source).toBe("teacher_assigned");
    expect(evidence.context.evidenceMode).toBe("production");
    expect(evidence.context.activityMode).toBe("assessment");
    expect(evidence.response.success).toBe(true);
    expect(evidence.id).toBe("secondary:2026-07-10:sub-1:teacher-approve");
  });

  it("updates word mastery records on approval", () => {
    const wordTarget = { type: "word" as const, key: "g7-a2-brave", label: "brave" };
    const existing = {
      [learningTargetKey(wordTarget)]: createEmptyMasteryRecord({
        studentId: "student-1",
        target: wordTarget,
        now: new Date("2026-07-09T00:00:00.000Z"),
      }),
    };

    const evidence = buildTeacherSentenceApprovalEvidence({
      studentId: "student-1",
      submissionId: "sub-1",
      wordItemId: "g7-a2-brave",
      dateKey: "2026-07-10",
    });

    const updated = applyTeacherSentenceApprovalToRecords(existing, evidence);
    expect(updated.length).toBeGreaterThan(0);
    const wordRecord = updated.find((record) => record.targetKey === learningTargetKey(wordTarget));
    expect(wordRecord?.exposureCount).toBeGreaterThan(0);
    expect(wordRecord?.retrievalSuccessCount).toBeGreaterThan(0);
  });
});

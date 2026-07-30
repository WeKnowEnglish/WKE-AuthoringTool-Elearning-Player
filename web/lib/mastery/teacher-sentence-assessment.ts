import { applyEvidenceToMasteryRecords, learningTargetKey } from "@/lib/mastery/engine";
import type { LearningEvidenceEvent, StudentMasteryRecord } from "@/lib/mastery/types";
import { createVocabularyEvidenceEvent } from "@/lib/mastery/vocabulary";
import { masteryRecordToRow } from "@/lib/mastery/supabase-rows";
import type { StudentMasteryRecordRow } from "@/lib/mastery/supabase-rows";
import { rowsToMasteryRecords } from "@/lib/mastery/teacher-mastery-summary";
import { resolveSecondaryMasteryWordKeys } from "@/lib/secondary/secondary-mastery-keys";

export type TeacherSentenceApprovalInput = {
  studentId: string;
  submissionId: string;
  wordItemId: string;
  dateKey: string;
  lemma?: string | null;
  reviewedAt?: Date;
};

export function buildTeacherSentenceApprovalEvidence(
  input: TeacherSentenceApprovalInput,
): LearningEvidenceEvent {
  const reviewedAt = input.reviewedAt ?? new Date();
  const keys = resolveSecondaryMasteryWordKeys(input.wordItemId);
  const aliasWordIds = keys.writeKeys.filter((id) => id !== keys.wordItemId);
  const base = createVocabularyEvidenceEvent({
    studentId: input.studentId,
    sessionId: `secondary:${input.dateKey}`,
    activityId: "secondary:sentence",
    wordId: keys.wordItemId,
    aliasWordIds,
    lemma: input.lemma,
    itemId: input.submissionId,
    success: true,
    firstTry: true,
    attempts: 1,
    responseKind: "type",
    evidenceMode: "production",
    scaffoldingLevel: "low",
    occurredAt: reviewedAt,
  });

  return {
    ...base,
    id: `secondary:${input.dateKey}:${input.submissionId}:teacher-approve`,
    source: "teacher_assigned",
    context: {
      ...base.context,
      activityMode: "assessment",
      scaffoldingLevel: "low",
    },
  };
}

export function applyTeacherSentenceApprovalToRecords(
  existingRecords: Record<string, StudentMasteryRecord>,
  evidence: LearningEvidenceEvent,
): StudentMasteryRecord[] {
  const next = applyEvidenceToMasteryRecords(existingRecords, evidence);
  const keys = new Set(evidence.targetRefs.map((ref) => learningTargetKey(ref)));
  return Object.values(next).filter((record) => keys.has(record.targetKey));
}

export function masteryRecordsToUpsertRows(
  studentId: string,
  records: StudentMasteryRecord[],
): Omit<StudentMasteryRecordRow, "id" | "created_at">[] {
  return records.map((record) => masteryRecordToRow(studentId, record));
}

export function rowsToRecordMap(rows: StudentMasteryRecordRow[]): Record<string, StudentMasteryRecord> {
  const records = rowsToMasteryRecords(rows);
  return Object.fromEntries(records.map((record) => [record.targetKey, record]));
}

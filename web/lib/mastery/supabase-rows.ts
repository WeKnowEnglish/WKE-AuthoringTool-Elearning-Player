import type {
  LearningEvidenceEvent,
  LearningTargetType,
  StudentMasteryRecord,
} from "@/lib/mastery/types";

/** Row shape for `student_mastery_records` (024_student_mastery.sql). */
export type StudentMasteryRecordRow = {
  id: string;
  student_id: string;
  target_key: string;
  target_type: LearningTargetType;
  record: StudentMasteryRecord;
  updated_at: string;
  created_at: string;
};

/** Row shape for `student_learning_evidence` (024_student_mastery.sql). */
export type StudentLearningEvidenceRow = {
  id: string;
  student_id: string;
  occurred_at: string;
  event: LearningEvidenceEvent;
  created_at: string;
};

export function masteryRecordToRow(
  studentId: string,
  record: StudentMasteryRecord,
): Omit<StudentMasteryRecordRow, "id" | "created_at"> {
  return {
    student_id: studentId,
    target_key: record.targetKey,
    target_type: record.targetType,
    record,
    updated_at: record.updatedAt,
  };
}

export function evidenceEventToRow(
  studentId: string,
  event: LearningEvidenceEvent,
): Omit<StudentLearningEvidenceRow, "created_at"> {
  return {
    id: event.id,
    student_id: studentId,
    occurred_at: event.occurredAt,
    event,
  };
}

export function rowToMasteryRecord(row: StudentMasteryRecordRow): StudentMasteryRecord {
  return row.record;
}

export function rowToLearningEvidenceEvent(
  row: StudentLearningEvidenceRow,
): LearningEvidenceEvent {
  return row.event;
}

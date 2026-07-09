import { describe, expect, it } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  evidenceEventToRow,
  masteryRecordToRow,
  rowToLearningEvidenceEvent,
  rowToMasteryRecord,
} from "@/lib/mastery/supabase-rows";
import type { LearningEvidenceEvent } from "@/lib/mastery/types";

const studentId = "a1111111-1111-4111-8111-111111111111";
const target = { type: "word" as const, key: "g7-a2-apple", label: "apple" };

function sampleEvidence(): LearningEvidenceEvent {
  return {
    id: "b2222222-2222-4222-8222-222222222222",
    studentId,
    sessionId: "secondary:2026-07-09",
    occurredAt: "2026-07-09T06:30:00.000Z",
    source: "vocab_set",
    activityId: "secondary:match",
    targetRefs: [target],
    response: {
      kind: "tap",
      success: true,
      firstTry: true,
      attempts: 1,
    },
    context: {
      evidenceMode: "recognition",
      activityMode: "practice",
    },
  };
}

describe("mastery supabase row mappers", () => {
  it("maps a mastery record to an upsert row", () => {
    const record = createEmptyMasteryRecord({
      studentId,
      target,
      now: new Date("2026-07-09T06:30:00.000Z"),
    });
    record.masteryScore = 0.42;
    record.updatedAt = "2026-07-09T06:31:00.000Z";

    const row = masteryRecordToRow(studentId, record);

    expect(row.student_id).toBe(studentId);
    expect(row.target_key).toBe("word:g7-a2-apple");
    expect(row.target_type).toBe("word");
    expect(row.updated_at).toBe("2026-07-09T06:31:00.000Z");
    expect(row.record).toBe(record);
  });

  it("round-trips a mastery record row", () => {
    const record = createEmptyMasteryRecord({ studentId, target });
    const insertRow = masteryRecordToRow(studentId, record);
    const storedRow = {
      id: "c3333333-3333-4333-8333-333333333333",
      created_at: "2026-07-09T06:30:00.000Z",
      ...insertRow,
    };

    expect(rowToMasteryRecord(storedRow)).toBe(record);
  });

  it("maps an evidence event to an insert row", () => {
    const event = sampleEvidence();
    const row = evidenceEventToRow(studentId, event);

    expect(row.id).toBe(event.id);
    expect(row.student_id).toBe(studentId);
    expect(row.occurred_at).toBe("2026-07-09T06:30:00.000Z");
    expect(row.event).toBe(event);
  });

  it("round-trips an evidence row", () => {
    const event = sampleEvidence();
    const insertRow = evidenceEventToRow(studentId, event);
    const storedRow = {
      created_at: "2026-07-09T06:30:00.000Z",
      ...insertRow,
    };

    expect(rowToLearningEvidenceEvent(storedRow)).toBe(event);
  });
});

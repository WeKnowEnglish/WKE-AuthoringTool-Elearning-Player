import {
  CLASS_TEACHER_EARLY_MS,
  CLASS_WAITING_OPEN_MS,
} from "@/lib/class-schedule/class-clock";
import { occurrenceStartsMatch } from "@/lib/class-schedule/occurrence-match";

export type EndedSessionDismissRow = {
  occurrence_starts_at: string | null;
  meeting_slot_id: string | null;
  session_kind: string | null;
  ended_at: string | null;
  created_at: string | null;
};

export type OccurrenceDismissWindow = {
  meetingSlotId: string;
  occurrenceStartsAt: string | Date;
  occurrenceEndsAt: string | Date;
  teacherEarlyMs?: number;
  postEndGraceMs?: number;
};

function toMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const ms = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function occurrenceDismissWindowBounds(
  meeting: Pick<
    OccurrenceDismissWindow,
    "occurrenceStartsAt" | "occurrenceEndsAt" | "teacherEarlyMs" | "postEndGraceMs"
  >,
): { windowStartMs: number; windowEndMs: number } | null {
  const startMs = toMs(meeting.occurrenceStartsAt);
  const endMs = toMs(meeting.occurrenceEndsAt);
  if (startMs == null || endMs == null) return null;

  const teacherEarlyMs = meeting.teacherEarlyMs ?? CLASS_TEACHER_EARLY_MS;
  const postEndGraceMs = meeting.postEndGraceMs ?? 15 * 60 * 1000;

  return {
    windowStartMs: startMs - teacherEarlyMs,
    windowEndMs: endMs + postEndGraceMs,
  };
}

/** Whether a teacher-ended session should block auto clock reopen for this occurrence. */
export function endedSessionDismissesOccurrence(
  row: EndedSessionDismissRow,
  meeting: OccurrenceDismissWindow,
): boolean {
  if (
    occurrenceStartsMatch(row.occurrence_starts_at, meeting.occurrenceStartsAt)
  ) {
    return true;
  }

  const bounds = occurrenceDismissWindowBounds(meeting);
  if (!bounds) return false;

  const { windowStartMs, windowEndMs } = bounds;
  const endedMs = toMs(row.ended_at);
  const createdMs = toMs(row.created_at);

  if (
    row.meeting_slot_id === meeting.meetingSlotId &&
    endedMs != null &&
    endedMs >= windowStartMs &&
    endedMs <= windowEndMs
  ) {
    return true;
  }

  if (
    endedMs != null &&
    endedMs >= windowStartMs &&
    endedMs <= windowEndMs
  ) {
    return true;
  }

  if (
    createdMs != null &&
    endedMs != null &&
    createdMs >= windowStartMs - CLASS_WAITING_OPEN_MS &&
    createdMs <= windowEndMs &&
    endedMs >= windowStartMs - CLASS_WAITING_OPEN_MS
  ) {
    return true;
  }

  return false;
}

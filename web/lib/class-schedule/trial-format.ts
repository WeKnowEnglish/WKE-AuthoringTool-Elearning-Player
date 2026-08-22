import {
  normalizeMeetingDuration,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import type {
  AvailabilitySlotStatus,
  TeacherAvailabilitySlot,
  TrialBookingRequest,
  TrialBookingStatus,
  TrialOccurrence,
} from "@/lib/class-schedule/trial-types";

const SLOT_STATUSES = new Set<AvailabilitySlotStatus>([
  "open",
  "held",
  "booked",
  "cancelled",
]);

const BOOKING_STATUSES = new Set<TrialBookingStatus>([
  "pending",
  "confirmed",
  "declined",
  "cancelled",
]);

export function normalizeAvailabilitySlotStatus(raw: unknown): AvailabilitySlotStatus {
  const value = typeof raw === "string" ? raw.trim() : "";
  return SLOT_STATUSES.has(value as AvailabilitySlotStatus)
    ? (value as AvailabilitySlotStatus)
    : "open";
}

export function normalizeTrialBookingStatus(raw: unknown): TrialBookingStatus {
  const value = typeof raw === "string" ? raw.trim() : "";
  return BOOKING_STATUSES.has(value as TrialBookingStatus)
    ? (value as TrialBookingStatus)
    : "pending";
}

export function normalizeTrialStartsAt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const date = new Date(trimmed);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function mapAvailabilitySlotRow(row: {
  id: string;
  teacher_id: string;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  status: string;
  note: string | null;
  series_id?: string | null;
  series_sequence?: number | null;
}): TeacherAvailabilitySlot | null {
  const startsAt = normalizeTrialStartsAt(row.starts_at);
  if (!startsAt) return null;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    startsAt,
    durationMinutes: normalizeMeetingDuration(row.duration_minutes),
    timezone: normalizeMeetingTimezone(row.timezone),
    status: normalizeAvailabilitySlotStatus(row.status),
    note: row.note?.trim() ? row.note.trim().slice(0, 280) : null,
    seriesId: row.series_id ?? null,
    seriesSequence:
      typeof row.series_sequence === "number" ? row.series_sequence : null,
  };
}

export function mapTrialBookingRow(row: {
  id: string;
  teacher_id: string;
  availability_slot_id: string;
  guardian_user_id: string;
  student_id: string | null;
  student_display_name?: string | null;
  child_age_band?: string | null;
  student_created_for_trial?: boolean | null;
  status: string;
  guardian_note: string | null;
  teacher_note: string | null;
  occurrence_id: string | null;
  class_id: string | null;
  created_at: string;
  starts_at?: string | null;
  duration_minutes?: number | null;
  timezone?: string | null;
}): TrialBookingRequest {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    availabilitySlotId: row.availability_slot_id,
    guardianUserId: row.guardian_user_id,
    studentId: row.student_id,
    studentDisplayName: (row.student_display_name ?? "Student").trim() || "Student",
    childAgeBand: row.child_age_band?.trim() ? row.child_age_band.trim().slice(0, 40) : null,
    studentCreatedForTrial: Boolean(row.student_created_for_trial),
    status: normalizeTrialBookingStatus(row.status),
    guardianNote: row.guardian_note,
    teacherNote: row.teacher_note,
    occurrenceId: row.occurrence_id,
    classId: row.class_id,
    createdAt: row.created_at,
    startsAt: row.starts_at ? normalizeTrialStartsAt(row.starts_at) : null,
    durationMinutes:
      typeof row.duration_minutes === "number"
        ? normalizeMeetingDuration(row.duration_minutes)
        : null,
    timezone: row.timezone ? normalizeMeetingTimezone(row.timezone) : null,
  };
}

export function mapTrialOccurrenceRow(row: {
  id: string;
  teacher_id: string;
  booking_id: string;
  student_id: string | null;
  guardian_user_id: string;
  class_id: string | null;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
}): TrialOccurrence | null {
  const startsAt = normalizeTrialStartsAt(row.starts_at);
  if (!startsAt) return null;
  return {
    id: row.id,
    teacherId: row.teacher_id,
    bookingId: row.booking_id,
    studentId: row.student_id,
    guardianUserId: row.guardian_user_id,
    classId: row.class_id,
    startsAt,
    durationMinutes: normalizeMeetingDuration(row.duration_minutes),
    timezone: normalizeMeetingTimezone(row.timezone),
  };
}

/** Label like "Tue, Aug 4 · 4:00 PM (45 min)" in the slot timezone. */
export function formatTrialSlotLabel(input: {
  startsAt: string;
  durationMinutes: number;
  timezone: string;
}): string {
  return formatTrialSlotLabelInTimeZone(input, input.timezone);
}

/** Format a slot for the viewer while retaining the source slot duration. */
export function formatTrialSlotLabelInTimeZone(
  input: { startsAt: string; durationMinutes: number; timezone: string },
  displayTimezone: string,
): string {
  const date = new Date(input.startsAt);
  if (!Number.isFinite(date.getTime())) return "Unavailable time";
  const when = new Intl.DateTimeFormat(undefined, {
    timeZone: displayTimezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${when} · ${input.durationMinutes} min · ${displayTimezone}`;
}

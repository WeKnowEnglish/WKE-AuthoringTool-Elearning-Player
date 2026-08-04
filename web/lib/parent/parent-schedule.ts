import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { resolveNextClassMeeting } from "@/lib/class-schedule/next-meeting";
import {
  normalizeMeetingDuration,
  normalizeMeetingStartTime,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import type {
  ClassMeetingSlot,
  ClassMeetingWeekday,
  StudentClassSchedule,
} from "@/lib/class-schedule/types";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { createClient } from "@/lib/supabase/server";

export type ParentStudentSchedule = StudentClassSchedule & {
  classId: string | null;
  classTitle: string | null;
};

type SlotRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  timezone: string;
};

function isWeekday(value: number): value is ClassMeetingWeekday {
  return value >= 0 && value <= 6;
}

function mapSlot(row: SlotRow): ClassMeetingSlot | null {
  if (!isWeekday(row.weekday)) return null;
  const startTime = normalizeMeetingStartTime(String(row.start_time).slice(0, 5));
  if (!startTime) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    weekday: row.weekday,
    startTime,
    durationMinutes: normalizeMeetingDuration(row.duration_minutes),
    timezone: normalizeMeetingTimezone(row.timezone),
  };
}

/**
 * Next lesson + weekly slots for a guardian-linked child.
 * Class id comes from parent_linked_students; slots use guardian RLS on class_meeting_slots.
 */
export async function getParentStudentSchedule(
  studentId: string,
): Promise<ParentStudentSchedule> {
  noStore();
  const empty: ParentStudentSchedule = {
    slots: [],
    nextMeeting: null,
    classId: null,
    classTitle: null,
  };

  const linked = await listParentLinkedStudents();
  const student = linked.find((row) => row.studentId === studentId.trim());
  if (!student?.classId) return empty;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_meeting_slots")
    .select("id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone")
    .eq("class_id", student.classId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (
      message.includes("class_meeting_slots") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return {
        ...empty,
        classId: student.classId,
        classTitle: student.classTitle,
      };
    }
    throw error;
  }

  const slots = ((data ?? []) as SlotRow[])
    .map(mapSlot)
    .filter((slot): slot is ClassMeetingSlot => slot !== null);

  return {
    slots,
    nextMeeting: resolveNextClassMeeting(slots),
    classId: student.classId,
    classTitle: student.classTitle,
  };
}

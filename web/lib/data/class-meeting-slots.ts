import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  normalizeMeetingDuration,
  normalizeMeetingStartTime,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import { resolveNextClassMeeting } from "@/lib/class-schedule/next-meeting";
import type {
  ClassMeetingSlot,
  ClassMeetingWeekday,
  StudentClassSchedule,
} from "@/lib/class-schedule/types";
import { createClient } from "@/lib/supabase/server";

type SlotRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  timezone: string;
};

function isMissingSlotsTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_meeting_slots") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

function isWeekday(value: number): value is ClassMeetingWeekday {
  return value >= 0 && value <= 6;
}

function mapSlotRow(row: SlotRow): ClassMeetingSlot | null {
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

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

export const listMeetingSlotsForClass = cache(async function listMeetingSlotsForClass(
  classId: string,
): Promise<ClassMeetingSlot[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_meeting_slots")
    .select("id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone")
    .eq("class_id", classId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    if (isMissingSlotsTable(error)) return [];
    throw error;
  }

  return (data as SlotRow[])
    .map(mapSlotRow)
    .filter((slot): slot is ClassMeetingSlot => slot !== null);
});

export async function getClassScheduleForStudentClass(
  classId: string,
): Promise<StudentClassSchedule> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isStudent(user)) {
    return { slots: [], nextMeeting: null };
  }

  const { data, error } = await supabase
    .from("class_meeting_slots")
    .select("id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone")
    .eq("class_id", classId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    if (isMissingSlotsTable(error)) return { slots: [], nextMeeting: null };
    throw error;
  }

  const slots = (data as SlotRow[])
    .map(mapSlotRow)
    .filter((slot): slot is ClassMeetingSlot => slot !== null);

  return {
    slots,
    nextMeeting: resolveNextClassMeeting(slots),
  };
}

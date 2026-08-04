import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeMeetingDuration,
  normalizeMeetingStartTime,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import type {
  ClassScheduleGroupingBoard,
  ClassSchedulePreference,
  ClassScheduleWindow,
} from "@/lib/class-schedule/preference-types";
import type { ClassMeetingWeekday } from "@/lib/class-schedule/types";
import { createClient } from "@/lib/supabase/server";

type WindowRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  timezone: string;
  sort_order: number;
};

type PreferenceRow = {
  id: string;
  class_id: string;
  student_id: string;
  guardian_user_id: string;
  ranked_window_ids: string[] | null;
  updated_at: string;
};

function isWeekday(value: number): value is ClassMeetingWeekday {
  return value >= 0 && value <= 6;
}

function mapWindow(row: WindowRow): ClassScheduleWindow | null {
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
    sortOrder: row.sort_order ?? 0,
  };
}

function mapPreference(row: PreferenceRow): ClassSchedulePreference {
  return {
    id: row.id,
    classId: row.class_id,
    studentId: row.student_id,
    guardianUserId: row.guardian_user_id,
    rankedWindowIds: Array.isArray(row.ranked_window_ids)
      ? row.ranked_window_ids.map(String)
      : [],
    updatedAt: row.updated_at,
  };
}

function isMissingTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_schedule_windows") ||
    message.includes("class_schedule_preferences") ||
    message.includes("preference_collection_open") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
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

export const getClassScheduleGroupingBoard = cache(
  async function getClassScheduleGroupingBoard(
    classId: string,
  ): Promise<ClassScheduleGroupingBoard> {
    noStore();
    await requireTeacherUserId();
    const supabase = await createClient();
    const empty: ClassScheduleGroupingBoard = {
      preferenceCollectionOpen: false,
      windows: [],
      preferences: [],
      firstChoiceCounts: {},
    };

    const { data: teacherClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id, preference_collection_open")
      .eq("id", classId)
      .maybeSingle();

    if (classError) {
      if (isMissingTable(classError)) return empty;
      throw classError;
    }
    if (!teacherClass) return empty;

    const [{ data: windowRows, error: windowError }, { data: prefRows, error: prefError }] =
      await Promise.all([
        supabase
          .from("class_schedule_windows")
          .select(
            "id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone, sort_order",
          )
          .eq("class_id", classId)
          .order("sort_order", { ascending: true })
          .order("weekday", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("class_schedule_preferences")
          .select(
            "id, class_id, student_id, guardian_user_id, ranked_window_ids, updated_at",
          )
          .eq("class_id", classId)
          .order("updated_at", { ascending: false }),
      ]);

    if (windowError) {
      if (isMissingTable(windowError)) return empty;
      throw windowError;
    }
    if (prefError) {
      if (isMissingTable(prefError)) return empty;
      throw prefError;
    }

    const windows = ((windowRows ?? []) as WindowRow[])
      .map(mapWindow)
      .filter((row): row is ClassScheduleWindow => row !== null);
    const preferences = ((prefRows ?? []) as PreferenceRow[]).map(mapPreference);
    const firstChoiceCounts: Record<string, number> = {};
    for (const preference of preferences) {
      const first = preference.rankedWindowIds[0];
      if (!first) continue;
      firstChoiceCounts[first] = (firstChoiceCounts[first] ?? 0) + 1;
    }

    return {
      preferenceCollectionOpen: Boolean(
        (teacherClass as { preference_collection_open?: boolean }).preference_collection_open,
      ),
      windows,
      preferences,
      firstChoiceCounts,
    };
  },
);

export async function listScheduleWindowsForGuardianClass(
  classId: string,
): Promise<ClassScheduleWindow[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_schedule_windows")
    .select(
      "id, class_id, teacher_id, weekday, start_time, duration_minutes, timezone, sort_order",
    )
    .eq("class_id", classId)
    .order("sort_order", { ascending: true })
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as WindowRow[])
    .map(mapWindow)
    .filter((row): row is ClassScheduleWindow => row !== null);
}

export async function getGuardianSchedulePreference(input: {
  classId: string;
  studentId: string;
}): Promise<ClassSchedulePreference | null> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_schedule_preferences")
    .select(
      "id, class_id, student_id, guardian_user_id, ranked_window_ids, updated_at",
    )
    .eq("class_id", input.classId)
    .eq("student_id", input.studentId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data ? mapPreference(data as PreferenceRow) : null;
}

"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { saveClassMeetingSlots } from "@/lib/actions/class-meeting-slots";
import {
  normalizeMeetingTimezone,
  normalizeRankedWindowIds,
  normalizeScheduleWindowInputs,
} from "@/lib/class-schedule/preference-normalize";
import type { ClassScheduleWindow } from "@/lib/class-schedule/preference-types";
import { getClassScheduleGroupingBoard } from "@/lib/data/class-schedule-preferences";
import { createClient } from "@/lib/supabase/server";

export type SchedulePreferenceActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type SaveWindowsResult =
  | { ok: true; windows: ClassScheduleWindow[] }
  | { ok: false; error: string };

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

function revalidateSurfaces(classId: string, studentId?: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/primary/class/${classId}`);
  revalidatePath(`/secondary/class/${classId}`);
  if (studentId) {
    revalidatePath(`/parent/students/${studentId}/stream`);
  }
  revalidatePath("/parent");
}

export async function setPreferenceCollectionOpen(input: {
  classId: string;
  open: boolean;
}): Promise<SchedulePreferenceActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    if (!classId) return { ok: false, error: "Missing class." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("teacher_classes")
      .update({
        preference_collection_open: Boolean(input.open),
        updated_at: new Date().toISOString(),
      })
      .eq("id", classId)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };
    revalidateSurfaces(classId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update collection.",
    };
  }
}

export async function saveClassScheduleWindows(input: {
  classId: string;
  timezone: string;
  windows: unknown;
}): Promise<SaveWindowsResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    if (!classId) return { ok: false, error: "Missing class." };

    const timezone = normalizeMeetingTimezone(input.timezone);
    const windows = normalizeScheduleWindowInputs(input.windows);
    if (windows.length < 2) {
      return { ok: false, error: "Add at least two time options for families." };
    }
    if (windows.length > 6) {
      return { ok: false, error: "At most six time options." };
    }

    const supabase = await createClient();
    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) return { ok: false, error: classError.message };
    if (!ownedClass) return { ok: false, error: "Class not found." };

    const { error: deleteError } = await supabase
      .from("class_schedule_windows")
      .delete()
      .eq("class_id", classId)
      .eq("teacher_id", teacherId);

    if (deleteError) return { ok: false, error: deleteError.message };

    const rows = windows.map((window, index) => ({
      class_id: classId,
      teacher_id: teacherId,
      weekday: window.weekday,
      start_time: `${window.startTime}:00`,
      duration_minutes: window.durationMinutes ?? 60,
      timezone,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("class_schedule_windows")
      .insert(rows);
    if (insertError) return { ok: false, error: insertError.message };

    // Clear stale preference ranks that referenced deleted window ids.
    await supabase
      .from("class_schedule_preferences")
      .delete()
      .eq("class_id", classId);

    revalidateSurfaces(classId);
    const board = await getClassScheduleGroupingBoard(classId);
    return { ok: true, windows: board.windows };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save time options.",
    };
  }
}

export async function lockClassScheduleFromWindow(input: {
  classId: string;
  windowId: string;
}): Promise<SchedulePreferenceActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const windowId = input.windowId.trim();
    if (!classId || !windowId) return { ok: false, error: "Missing class or window." };

    const supabase = await createClient();
    const { data: windowRow, error: windowError } = await supabase
      .from("class_schedule_windows")
      .select("id, weekday, start_time, duration_minutes, timezone")
      .eq("id", windowId)
      .eq("class_id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (windowError) return { ok: false, error: windowError.message };
    if (!windowRow) return { ok: false, error: "Time option not found." };

    const startTime = String(windowRow.start_time).slice(0, 5);
    const saveResult = await saveClassMeetingSlots({
      classId,
      timezone: String(windowRow.timezone),
      slots: [
        {
          weekday: Number(windowRow.weekday),
          startTime,
          durationMinutes: Number(windowRow.duration_minutes) || 60,
        },
      ],
    });
    if (!saveResult.ok) return saveResult;

    const { error: closeError } = await supabase
      .from("teacher_classes")
      .update({
        preference_collection_open: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classId)
      .eq("teacher_id", teacherId);

    if (closeError) return { ok: false, error: closeError.message };

    revalidateSurfaces(classId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not lock schedule.",
    };
  }
}

export async function submitClassSchedulePreference(input: {
  classId: string;
  studentId: string;
  rankedWindowIds: unknown;
}): Promise<SchedulePreferenceActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, error: "Sign in required." };

    const classId = input.classId.trim();
    const studentId = input.studentId.trim();
    if (!classId || !studentId) return { ok: false, error: "Missing class or student." };

    const { data: windowRows, error: windowError } = await supabase
      .from("class_schedule_windows")
      .select("id")
      .eq("class_id", classId);

    if (windowError) return { ok: false, error: windowError.message };
    const allowed = new Set((windowRows ?? []).map((row) => String(row.id)));
    const rankedWindowIds = normalizeRankedWindowIds(input.rankedWindowIds, allowed);
    if (rankedWindowIds.length < 1) {
      return { ok: false, error: "Choose at least one preferred time." };
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("class_schedule_preferences").upsert(
      {
        class_id: classId,
        student_id: studentId,
        guardian_user_id: user.id,
        ranked_window_ids: rankedWindowIds,
        updated_at: now,
      },
      { onConflict: "class_id,student_id" },
    );

    if (error) return { ok: false, error: error.message };
    revalidateSurfaces(classId, studentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save preferences.",
    };
  }
}

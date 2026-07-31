"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeMeetingSlotInputs,
  normalizeMeetingTimezone,
} from "@/lib/class-schedule/normalize";
import type { ClassMeetingSlot } from "@/lib/class-schedule/types";
import { listMeetingSlotsForClass } from "@/lib/data/class-meeting-slots";
import { createClient } from "@/lib/supabase/server";

export type ClassMeetingSlotsActionResult =
  | { ok: true; slots: ClassMeetingSlot[] }
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

function revalidateClassSurfaces(classId: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/primary/class/${classId}`);
  revalidatePath(`/secondary/class/${classId}`);
  revalidatePath("/primary");
  revalidatePath("/secondary");
}

export async function saveClassMeetingSlots(input: {
  classId: string;
  timezone: string;
  slots: unknown;
}): Promise<ClassMeetingSlotsActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    if (!classId) return { ok: false, error: "Missing class." };

    const timezone = normalizeMeetingTimezone(input.timezone);
    const slots = normalizeMeetingSlotInputs(input.slots);

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
      .from("class_meeting_slots")
      .delete()
      .eq("class_id", classId)
      .eq("teacher_id", teacherId);

    if (deleteError) return { ok: false, error: deleteError.message };

    if (slots.length > 0) {
      const rows = slots.map((slot) => ({
        class_id: classId,
        teacher_id: teacherId,
        weekday: slot.weekday,
        start_time: `${slot.startTime}:00`,
        duration_minutes: slot.durationMinutes ?? 60,
        timezone,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from("class_meeting_slots").insert(rows);
      if (insertError) return { ok: false, error: insertError.message };
    }

    revalidateClassSurfaces(classId);
    const saved = await listMeetingSlotsForClass(classId);
    return { ok: true, slots: saved };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save schedule.",
    };
  }
}

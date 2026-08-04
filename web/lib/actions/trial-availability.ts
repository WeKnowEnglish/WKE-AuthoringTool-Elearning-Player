"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeMeetingDuration,
  normalizeMeetingTimezone,
  wallClockInTimeZoneToUtcIso,
} from "@/lib/class-schedule/normalize";
import { createClient } from "@/lib/supabase/server";

export type TrialActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type TrialConfirmResult =
  | {
      ok: true;
      classId: string | null;
      occurrenceId: string | null;
      studentId: string | null;
      createdCredentials: { username: string; pin: string } | null;
    }
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

function revalidateTrialSurfaces(studentId?: string | null) {
  revalidatePath("/teacher/availability");
  revalidatePath("/teacher/classes");
  revalidatePath("/parent");
  revalidatePath("/parents");
  revalidatePath("/parents/teachers");
  if (studentId) {
    revalidatePath(`/parent/students/${studentId}/stream`);
  }
}

function rpcErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "string") return fallback;
  switch (error) {
    case "slot_unavailable":
    case "slot_pending":
      return "That time is no longer available.";
    case "slot_not_found":
      return "That time slot was not found.";
    case "not_guardian":
      return "You can only book for a linked child.";
    case "child_name_required":
      return "Enter your child's name.";
    case "child_name_too_long":
      return "Child name is too long.";
    case "not_pending":
      return "This request was already handled.";
    case "not_found":
      return "Request not found.";
    case "not_owner":
      return "You can only cancel your own request.";
    case "teacher_only":
      return "Teacher authentication required.";
    case "note_too_long":
      return "Note is too long.";
    default:
      return fallback;
  }
}

export async function createTeacherAvailabilitySlot(input: {
  /** datetime-local wall clock `YYYY-MM-DDTHH:mm` interpreted in `timezone` */
  startsAtWall: string;
  durationMinutes: number;
  timezone: string;
  note?: string;
}): Promise<TrialActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const timezone = normalizeMeetingTimezone(input.timezone);
    const startsAt = wallClockInTimeZoneToUtcIso(input.startsAtWall, timezone);
    if (!startsAt) return { ok: false, error: "Choose a valid start time." };
    if (new Date(startsAt).getTime() <= Date.now()) {
      return { ok: false, error: "Start time must be in the future." };
    }

    const note = input.note?.trim() ? input.note.trim().slice(0, 280) : null;
    const supabase = await createClient();
    const { error } = await supabase.from("teacher_availability_slots").insert({
      teacher_id: teacherId,
      starts_at: startsAt,
      duration_minutes: normalizeMeetingDuration(input.durationMinutes),
      timezone,
      status: "open",
      note,
    });

    if (error) return { ok: false, error: error.message };
    revalidateTrialSurfaces();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not publish slot.",
    };
  }
}

export async function cancelTeacherAvailabilitySlot(
  slotId: string,
): Promise<TrialActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = slotId.trim();
    if (!id) return { ok: false, error: "Missing slot." };

    const supabase = await createClient();
    const { data: slot, error: loadError } = await supabase
      .from("teacher_availability_slots")
      .select("id, status")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (loadError) return { ok: false, error: loadError.message };
    if (!slot) return { ok: false, error: "Slot not found." };
    if (slot.status === "booked") {
      return { ok: false, error: "Booked slots cannot be cancelled here." };
    }
    if (slot.status === "held") {
      return { ok: false, error: "Decline the pending request first." };
    }

    const { error } = await supabase
      .from("teacher_availability_slots")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };
    revalidateTrialSurfaces();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not cancel slot.",
    };
  }
}

export async function setTeacherTrialsEnabled(
  enabled: boolean,
): Promise<TrialActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const supabase = await createClient();
    const { data: space, error: spaceError } = await supabase
      .from("teacher_spaces")
      .select("id, is_published, handle")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (spaceError) return { ok: false, error: spaceError.message };
    if (!space) {
      return {
        ok: false,
        error: "Publish a Classroom Wall space first, then enable trial booking.",
      };
    }
    if (enabled && !space.is_published) {
      return {
        ok: false,
        error: "Publish your Classroom Wall space before accepting trial bookings.",
      };
    }

    const { error } = await supabase
      .from("teacher_spaces")
      .update({
        trials_enabled: Boolean(enabled),
        updated_at: new Date().toISOString(),
      })
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };
    revalidateTrialSurfaces();
    if (typeof space.handle === "string") {
      revalidatePath(`/wke/${space.handle}`);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update trial setting.",
    };
  }
}

export async function requestTrialBooking(input: {
  availabilitySlotId: string;
  studentId?: string | null;
  childDisplayName?: string | null;
  childAgeBand?: string | null;
  guardianNote?: string;
}): Promise<TrialActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { ok: false, error: "Sign in as a parent to book." };

    const slotId = input.availabilitySlotId.trim();
    if (!slotId) return { ok: false, error: "Missing booking details." };

    const studentId = input.studentId?.trim() || null;
    const childName = input.childDisplayName?.trim() || null;
    if (!studentId && (!childName || childName.length < 2)) {
      return { ok: false, error: "Enter your child's name, or choose a linked child." };
    }

    const note = input.guardianNote?.trim() ? input.guardianNote.trim().slice(0, 400) : null;
    const ageBand = input.childAgeBand?.trim() ? input.childAgeBand.trim().slice(0, 40) : null;

    const { data, error } = await supabase.rpc("request_trial_booking", {
      p_availability_slot_id: slotId,
      p_student_id: studentId,
      p_guardian_note: note,
      p_child_display_name: childName,
      p_child_age_band: ageBand,
    });

    if (error) return { ok: false, error: error.message };
    if (!data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
      return { ok: false, error: rpcErrorMessage(data, "Could not request booking.") };
    }

    revalidateTrialSurfaces(studentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not request booking.",
    };
  }
}

export async function cancelTrialBooking(bookingId: string): Promise<TrialActionResult> {
  try {
    const id = bookingId.trim();
    if (!id) return { ok: false, error: "Missing request." };
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("trial_booking_requests")
      .select("student_id")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase.rpc("cancel_trial_booking", {
      p_booking_id: id,
    });
    if (error) return { ok: false, error: error.message };
    if (!data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
      return { ok: false, error: rpcErrorMessage(data, "Could not cancel request.") };
    }
    revalidateTrialSurfaces(existing?.student_id as string | undefined);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not cancel request.",
    };
  }
}

export async function confirmTrialBooking(input: {
  bookingId: string;
  teacherNote?: string;
}): Promise<TrialConfirmResult> {
  try {
    await requireTeacherUserId();
    const bookingId = input.bookingId.trim();
    if (!bookingId) return { ok: false, error: "Missing request." };

    const supabase = await createClient();
    const { data: existing, error: loadError } = await supabase
      .from("trial_booking_requests")
      .select("student_id, student_display_name, child_age_band, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (loadError) return { ok: false, error: loadError.message };
    if (!existing) return { ok: false, error: "Request not found." };
    if (existing.status !== "pending") {
      return { ok: false, error: "This request was already handled." };
    }

    let studentId =
      typeof existing.student_id === "string" ? existing.student_id : null;
    let createdCredentials: { username: string; pin: string } | null = null;

    if (!studentId) {
      const {
        createStudentForTrialProspect,
        deleteTrialProspectStudent,
      } = await import("@/lib/trial/create-prospect-student");

      const created = await createStudentForTrialProspect({
        displayName: String(existing.student_display_name ?? "Student"),
        childAgeBand:
          typeof existing.child_age_band === "string" ? existing.child_age_band : null,
      });
      if (!created.ok) return { ok: false, error: created.error };

      const { data: attachData, error: attachError } = await supabase.rpc(
        "attach_student_to_pending_trial_booking",
        {
          p_booking_id: bookingId,
          p_student_id: created.student.studentId,
        },
      );

      if (attachError || !attachData || typeof attachData !== "object" || !(attachData as { ok?: boolean }).ok) {
        await deleteTrialProspectStudent(created.student.studentId);
        return {
          ok: false,
          error: attachError?.message
            ?? rpcErrorMessage(attachData, "Could not link the new student to this family."),
        };
      }

      studentId = created.student.studentId;
      createdCredentials = {
        username: created.student.username,
        pin: created.student.pin,
      };
    }

    const note = input.teacherNote?.trim() ? input.teacherNote.trim().slice(0, 400) : null;
    const { data, error } = await supabase.rpc("confirm_trial_booking", {
      p_booking_id: bookingId,
      p_teacher_note: note,
    });

    if (error) return { ok: false, error: error.message };
    if (!data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
      return { ok: false, error: rpcErrorMessage(data, "Could not confirm booking.") };
    }

    const payload = data as { classId?: string; occurrenceId?: string };
    revalidateTrialSurfaces(studentId);
    if (payload.classId) {
      revalidatePath(`/teacher/classes/${payload.classId}`);
    }
    return {
      ok: true,
      classId: typeof payload.classId === "string" ? payload.classId : null,
      occurrenceId: typeof payload.occurrenceId === "string" ? payload.occurrenceId : null,
      studentId,
      createdCredentials,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not confirm booking.",
    };
  }
}

export async function declineTrialBooking(input: {
  bookingId: string;
  teacherNote?: string;
}): Promise<TrialActionResult> {
  try {
    await requireTeacherUserId();
    const bookingId = input.bookingId.trim();
    if (!bookingId) return { ok: false, error: "Missing request." };

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("trial_booking_requests")
      .select("student_id")
      .eq("id", bookingId)
      .maybeSingle();

    const note = input.teacherNote?.trim() ? input.teacherNote.trim().slice(0, 400) : null;
    const { data, error } = await supabase.rpc("decline_trial_booking", {
      p_booking_id: bookingId,
      p_teacher_note: note,
    });

    if (error) return { ok: false, error: error.message };
    if (!data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
      return { ok: false, error: rpcErrorMessage(data, "Could not decline booking.") };
    }

    revalidateTrialSurfaces(existing?.student_id as string | undefined);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not decline booking.",
    };
  }
}

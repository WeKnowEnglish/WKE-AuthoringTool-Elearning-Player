import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import {
  mapAvailabilitySlotRow,
  mapTrialBookingRow,
  mapTrialOccurrenceRow,
} from "@/lib/class-schedule/trial-format";
import type {
  TeacherAvailabilitySlot,
  TrialBookingRequest,
  TrialOccurrence,
  TrialStudentDiscovery,
} from "@/lib/class-schedule/trial-types";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

function isMissingTrialTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("teacher_availability_slots") ||
    message.includes("trial_booking_requests") ||
    message.includes("trial_occurrences") ||
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

export const listMyAvailabilitySlots = cache(async function listMyAvailabilitySlots(): Promise<
  TeacherAvailabilitySlot[]
> {
  noStore();
  const teacherId = await requireTeacherUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_availability_slots")
    .select("id, teacher_id, starts_at, duration_minutes, timezone, status, note, series_id, series_sequence")
    .eq("teacher_id", teacherId)
    .neq("status", "cancelled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => mapAvailabilitySlotRow(row as Parameters<typeof mapAvailabilitySlotRow>[0]))
    .filter((slot): slot is TeacherAvailabilitySlot => Boolean(slot));
});

export const listMyTrialBookings = cache(async function listMyTrialBookings(): Promise<
  TrialBookingRequest[]
> {
  noStore();
  const teacherId = await requireTeacherUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trial_booking_requests")
    .select(
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, student_created_for_trial, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  const bookings = (data ?? []).map((row) =>
    mapTrialBookingRow(row as Parameters<typeof mapTrialBookingRow>[0]),
  );
  if (!bookings.length) return [];

  const slotIds = [...new Set(bookings.map((b) => b.availabilitySlotId))];
  const { data: slots, error: slotError } = await supabase
    .from("teacher_availability_slots")
    .select("id, starts_at, duration_minutes, timezone")
    .in("id", slotIds);

  if (slotError && !isMissingTrialTable(slotError)) throw slotError;

  const slotById = new Map(
    (slots ?? []).map((slot) => [
      slot.id as string,
      {
        startsAt: slot.starts_at as string,
        durationMinutes: slot.duration_minutes as number,
        timezone: slot.timezone as string,
      },
    ]),
  );

  return bookings.map((booking) => {
    const slot = slotById.get(booking.availabilitySlotId);
    return {
      ...booking,
      startsAt: slot?.startsAt ?? null,
      durationMinutes: slot?.durationMinutes ?? null,
      timezone: slot?.timezone ?? null,
    };
  });
});

export async function listOpenAvailabilityForTeacher(
  teacherId: string,
): Promise<TeacherAvailabilitySlot[]> {
  noStore();
  const id = teacherId.trim();
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_availability_slots")
    .select("id, teacher_id, starts_at, duration_minutes, timezone, status, note, series_id, series_sequence")
    .eq("teacher_id", id)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(40);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => mapAvailabilitySlotRow(row as Parameters<typeof mapAvailabilitySlotRow>[0]))
    .filter((slot): slot is TeacherAvailabilitySlot => Boolean(slot));
}

export async function listParentTrialBookingsForStudent(
  studentId: string,
): Promise<TrialBookingRequest[]> {
  noStore();
  const id = studentId.trim();
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trial_booking_requests")
    .select(
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, student_created_for_trial, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
    )
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  const bookings = (data ?? []).map((row) =>
    mapTrialBookingRow(row as Parameters<typeof mapTrialBookingRow>[0]),
  );
  if (!bookings.length) return [];

  const slotIds = [...new Set(bookings.map((b) => b.availabilitySlotId))];
  const { data: slots } = await supabase
    .from("teacher_availability_slots")
    .select("id, starts_at, duration_minutes, timezone")
    .in("id", slotIds);

  const slotById = new Map(
    (slots ?? []).map((slot) => [
      slot.id as string,
      {
        startsAt: slot.starts_at as string,
        durationMinutes: slot.duration_minutes as number,
        timezone: slot.timezone as string,
      },
    ]),
  );

  return bookings.map((booking) => {
    const slot = slotById.get(booking.availabilitySlotId);
    return {
      ...booking,
      startsAt: slot?.startsAt ?? null,
      durationMinutes: slot?.durationMinutes ?? null,
      timezone: slot?.timezone ?? null,
    };
  });
}

export async function listParentUpcomingTrialOccurrences(
  studentId: string,
): Promise<TrialOccurrence[]> {
  noStore();
  const id = studentId.trim();
  if (!id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trial_occurrences")
    .select(
      "id, teacher_id, booking_id, student_id, guardian_user_id, class_id, starts_at, duration_minutes, timezone",
    )
    .eq("student_id", id)
    .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => mapTrialOccurrenceRow(row as Parameters<typeof mapTrialOccurrenceRow>[0]))
    .filter((row): row is TrialOccurrence => Boolean(row));
}

export async function listParentOwnTrialBookings(): Promise<TrialBookingRequest[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("trial_booking_requests")
    .select(
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, student_created_for_trial, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
    )
    .eq("guardian_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  const bookings = (data ?? []).map((row) =>
    mapTrialBookingRow(row as Parameters<typeof mapTrialBookingRow>[0]),
  );
  if (!bookings.length) return [];

  const slotIds = [...new Set(bookings.map((b) => b.availabilitySlotId))];
  const { data: slots } = await supabase
    .from("teacher_availability_slots")
    .select("id, starts_at, duration_minutes, timezone")
    .in("id", slotIds);

  const slotById = new Map(
    (slots ?? []).map((slot) => [
      slot.id as string,
      {
        startsAt: slot.starts_at as string,
        durationMinutes: slot.duration_minutes as number,
        timezone: slot.timezone as string,
      },
    ]),
  );

  return bookings.map((booking) => {
    const slot = slotById.get(booking.availabilitySlotId);
    return {
      ...booking,
      startsAt: slot?.startsAt ?? null,
      durationMinutes: slot?.durationMinutes ?? null,
      timezone: slot?.timezone ?? null,
    };
  });
}

export async function listParentOwnUpcomingTrialOccurrences(): Promise<TrialOccurrence[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from("trial_occurrences")
    .select(
      "id, teacher_id, booking_id, student_id, guardian_user_id, class_id, starts_at, duration_minutes, timezone",
    )
    .eq("guardian_user_id", user.id)
    .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  if (error) {
    if (isMissingTrialTable(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => mapTrialOccurrenceRow(row as Parameters<typeof mapTrialOccurrenceRow>[0]))
    .filter((row): row is TrialOccurrence => Boolean(row));
}

export type ParentTrialBookingDetails = {
  booking: TrialBookingRequest;
  openSlots: TeacherAvailabilitySlot[];
  studentUsername: string | null;
};

/** Parent-owned booking detail used by the edit/reschedule and child setup page. */
export async function getParentTrialBookingDetails(
  bookingId: string,
): Promise<ParentTrialBookingDetails | null> {
  noStore();
  const id = bookingId.trim();
  if (!id) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data: row, error } = await supabase
    .from("trial_booking_requests")
    .select(
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, student_created_for_trial, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
    )
    .eq("id", id)
    .eq("guardian_user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingTrialTable(error)) return null;
    throw error;
  }
  if (!row) return null;

  const booking = mapTrialBookingRow(
    row as Parameters<typeof mapTrialBookingRow>[0],
  );
  const { data: currentSlot, error: currentSlotError } = await supabase
    .from("teacher_availability_slots")
    .select("id, starts_at, duration_minutes, timezone")
    .eq("id", booking.availabilitySlotId)
    .maybeSingle();
  if (currentSlotError && !isMissingTrialTable(currentSlotError)) {
    throw currentSlotError;
  }
  if (currentSlot) {
    booking.startsAt = String(currentSlot.starts_at);
    booking.durationMinutes = Number(currentSlot.duration_minutes);
    booking.timezone = String(currentSlot.timezone);
  }

  const openSlots = await listOpenAvailabilityForTeacher(booking.teacherId);
  let studentUsername: string | null = null;
  if (booking.studentCreatedForTrial && booking.studentId) {
    const admin = createServiceRoleSupabase();
    if (admin) {
      const { data: profile } = await admin
        .from("student_profiles")
        .select("username")
        .eq("user_id", booking.studentId)
        .maybeSingle();
      studentUsername =
        typeof profile?.username === "string" ? profile.username : null;
    }
  }

  return { booking, openSlots, studentUsername };
}

function mapTrialStudentDiscoveryRow(row: Record<string, unknown>): TrialStudentDiscovery {
  return {
    id: String(row.id),
    bookingId: String(row.booking_id),
    classId: String(row.class_id),
    teacherId: String(row.teacher_id),
    guardianUserId: String(row.guardian_user_id),
    studentId: String(row.student_id),
    preferredName: String(row.preferred_name || "Student"),
    interests: row.interests ? String(row.interests) : null,
    englishGoals: row.english_goals ? String(row.english_goals) : null,
    englishUse: row.english_use ? String(row.english_use) : null,
    confidence:
      typeof row.confidence === "number" ? row.confidence : null,
    feelsEasy: row.feels_easy ? String(row.feels_easy) : null,
    feelsDifficult: row.feels_difficult ? String(row.feels_difficult) : null,
    submittedAt: String(row.submitted_at),
  };
}

export async function getTrialStudentDiscoveryForClass(
  classId: string,
): Promise<TrialStudentDiscovery | null> {
  noStore();
  const id = classId.trim();
  if (!id) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trial_student_discovery")
    .select(
      "id, booking_id, class_id, teacher_id, guardian_user_id, student_id, preferred_name, interests, english_goals, english_use, confidence, feels_easy, feels_difficult, submitted_at",
    )
    .eq("class_id", id)
    .maybeSingle();
  if (error) {
    if (isMissingTrialTable(error)) return null;
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("trial_student_discovery") || error.code === "PGRST205") {
      return null;
    }
    throw error;
  }
  return data ? mapTrialStudentDiscoveryRow(data as Record<string, unknown>) : null;
}

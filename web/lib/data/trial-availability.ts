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
} from "@/lib/class-schedule/trial-types";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, teacher_id, starts_at, duration_minutes, timezone, status, note")
    .eq("teacher_id", teacherId)
    .neq("status", "cancelled")
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
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
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
    .select("id, teacher_id, starts_at, duration_minutes, timezone, status, note")
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
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
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
      "id, teacher_id, availability_slot_id, guardian_user_id, student_id, student_display_name, child_age_band, status, guardian_note, teacher_note, occurrence_id, class_id, created_at",
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

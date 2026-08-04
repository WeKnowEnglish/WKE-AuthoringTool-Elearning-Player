export type AvailabilitySlotStatus = "open" | "held" | "booked" | "cancelled";

export type TrialBookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type TeacherAvailabilitySlot = {
  id: string;
  teacherId: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  status: AvailabilitySlotStatus;
  note: string | null;
};

export type TrialBookingRequest = {
  id: string;
  teacherId: string;
  availabilitySlotId: string;
  guardianUserId: string;
  studentId: string | null;
  studentDisplayName: string;
  childAgeBand: string | null;
  status: TrialBookingStatus;
  guardianNote: string | null;
  teacherNote: string | null;
  occurrenceId: string | null;
  classId: string | null;
  createdAt: string;
  startsAt: string | null;
  durationMinutes: number | null;
  timezone: string | null;
};

export type TrialOccurrence = {
  id: string;
  teacherId: string;
  bookingId: string;
  studentId: string | null;
  guardianUserId: string;
  classId: string | null;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
};

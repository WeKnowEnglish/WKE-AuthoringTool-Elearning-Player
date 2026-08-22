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
  seriesId: string | null;
  seriesSequence: number | null;
};

export type TrialBookingRequest = {
  id: string;
  teacherId: string;
  availabilitySlotId: string;
  guardianUserId: string;
  studentId: string | null;
  studentDisplayName: string;
  childAgeBand: string | null;
  studentCreatedForTrial: boolean;
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

export type TrialStudentDiscovery = {
  id: string;
  bookingId: string;
  classId: string;
  teacherId: string;
  guardianUserId: string;
  studentId: string;
  preferredName: string;
  interests: string | null;
  englishGoals: string | null;
  englishUse: string | null;
  confidence: number | null;
  feelsEasy: string | null;
  feelsDifficult: string | null;
  submittedAt: string;
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

import type { ClassMeetingWeekday } from "@/lib/class-schedule/types";

export type ClassScheduleWindow = {
  id: string;
  classId: string;
  teacherId: string;
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  sortOrder: number;
};

export type ClassScheduleWindowInput = {
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes?: number;
};

export type ClassSchedulePreference = {
  id: string;
  classId: string;
  studentId: string;
  guardianUserId: string;
  rankedWindowIds: string[];
  updatedAt: string;
};

export type ClassScheduleGroupingBoard = {
  preferenceCollectionOpen: boolean;
  windows: ClassScheduleWindow[];
  preferences: ClassSchedulePreference[];
  /** First-choice counts keyed by window id. */
  firstChoiceCounts: Record<string, number>;
};

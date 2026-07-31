export const CLASS_MEETING_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type ClassMeetingWeekday = (typeof CLASS_MEETING_WEEKDAYS)[number];

export const CLASS_MEETING_WEEKDAY_LABELS: Record<ClassMeetingWeekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const CLASS_MEETING_WEEKDAY_SHORT: Record<ClassMeetingWeekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const DEFAULT_CLASS_MEETING_TIMEZONE = "Asia/Bangkok";

export type ClassMeetingSlot = {
  id: string;
  classId: string;
  teacherId: string;
  weekday: ClassMeetingWeekday;
  /** 24h local time in the class timezone, e.g. "16:00". */
  startTime: string;
  durationMinutes: number;
  timezone: string;
};

export type ClassMeetingSlotInput = {
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes?: number;
};

export type StudentNextClassMeeting = {
  startsAt: string;
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  label: string;
};

export type StudentClassSchedule = {
  slots: ClassMeetingSlot[];
  nextMeeting: StudentNextClassMeeting | null;
};

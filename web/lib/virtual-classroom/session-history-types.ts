import type { ClassSessionKind } from "@/lib/class-schedule/class-clock";

export type VirtualClassroomSessionHistoryItem = {
  sessionId: string;
  title: string;
  sessionKind: ClassSessionKind;
  occurrenceLabel: string | null;
  startedAt: string;
  endedAt: string | null;
  /** Session had at least one student in lobby or on video. */
  held: boolean;
  studentsPresent: number;
  joinCode: string;
  lessonTitle: string | null;
};

export type WaitingRoomState = {
  sessionId: string;
  classTitle: string | null;
  occurrenceLabel: string | null;
  autoLiveAt: string | null;
  phase: "waiting" | "live" | "prep" | "ended" | "idle";
  teacherPresent: boolean;
  classmatesWaiting: number;
  waitingCount: number;
};

/** VirtualClassroom product domain — live hosted class session. */

import type {
  ClassSessionKind,
  ClassSessionPhase,
} from "@/lib/class-schedule/class-clock";

export type VirtualClassroomSessionStatus = "active" | "ended";

export type VirtualClassroomAuthRole = "host" | "member";

export type VirtualClassroomSessionRecord = {
  id: string;
  /** Null for one-off stress / guest sessions. */
  classId: string | null;
  /** Staged Create Lesson playlist bound for this live session (nullable). */
  classLessonId: string | null;
  joinCode: string;
  liveblocksRoomId: string;
  title: string;
  status: VirtualClassroomSessionStatus;
  createdBy: string;
  createdAt: string;
  endedAt: string | null;
  meetingSlotId: string | null;
  occurrenceStartsAt: string | null;
  occurrenceEndsAt: string | null;
  sessionKind: ClassSessionKind;
  classPhase: ClassSessionPhase;
};

export const VC_SESSION_ROOM_PREFIX = "wke-vc-session-";

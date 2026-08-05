import type {
  ClassLivePhase,
  ClassSessionKind,
  ClassSessionPhase,
} from "@/lib/class-schedule/class-clock";

/** Shared live-state DTO (safe for client + server). */
export type ClassLiveState = {
  phase: ClassLivePhase;
  kind: ClassSessionKind | null;
  occurrenceStartsAt: string | null;
  occurrenceEndsAt: string | null;
  occurrenceLabel: string | null;
  meetingSlotId: string | null;
  sessionId: string | null;
  joinCode: string | null;
  sessionTitle: string | null;
  classPhase: ClassSessionPhase | null;
  canStudentEnterWaiting: boolean;
  canStudentEnterLive: boolean;
  canTeacherOpenEarly: boolean;
  canTeacherJoinVideo: boolean;
  canTeacherStartNow: boolean;
  autoLiveAt: string | null;
  waitingOpensAt: string | null;
};

import type {
  ClassLivePhase,
  ClassSessionKind,
  ClassSessionPhase,
} from "@/lib/class-schedule/class-clock";

export type StudentClassLiveSession = {
  classId: string;
  classTitle: string;
  sessionId: string;
  joinCode: string;
  sessionTitle: string;
  phase: ClassLivePhase;
  kind: ClassSessionKind | null;
  classPhase: ClassSessionPhase | null;
  occurrenceLabel: string | null;
  meetingSlotId: string | null;
  canEnterWaiting: boolean;
  canEnterLive: boolean;
  landingPath: string;
};

export function studentLandingPath(sessionId: string, phase: ClassLivePhase): string {
  if (phase === "waiting") {
    return `/virtual-classroom/${encodeURIComponent(sessionId)}/waiting`;
  }
  return `/virtual-classroom/${encodeURIComponent(sessionId)}`;
}

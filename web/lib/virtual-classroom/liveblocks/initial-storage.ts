import { LiveMap, LiveObject } from "@liveblocks/client";
import type { RandomiserState } from "@/lib/virtual-classroom/tools/dice";
import { createEmptyRandomiser } from "@/lib/virtual-classroom/tools/dice";
import type { GroupSetState } from "@/lib/virtual-classroom/tools/groups";
import { createEmptyGroupSet } from "@/lib/virtual-classroom/tools/groups";
import type { StudentPickerState } from "@/lib/virtual-classroom/tools/picker";
import { createEmptyPickerState } from "@/lib/virtual-classroom/tools/picker";
import type { SessionPointsState } from "@/lib/virtual-classroom/tools/points";
import { createEmptySessionPoints } from "@/lib/virtual-classroom/tools/points";
import type { ClassroomStatusState } from "@/lib/virtual-classroom/tools/status";
import { createEmptyClassroomStatus } from "@/lib/virtual-classroom/tools/status";
import type { GlobalTimerState } from "@/lib/virtual-classroom/tools/timer";
import { createIdleGlobalTimer } from "@/lib/virtual-classroom/tools/timer";

/** Shared in-session layout: meeting = viewport-filling cameras; learn = materials + docked video. */
export type VirtualClassroomUiMode = "meeting" | "learn";

/** Shared Learn stage: everyone sees the same surface. */
export type VirtualClassroomLearnStage = "whiteboard" | "activity";

export type VirtualClassroomLearnActivity = {
  activityId: string;
  format: string;
  title: string;
  playPath: string;
};

export function normalizeVirtualClassroomUiMode(
  value: unknown,
): VirtualClassroomUiMode {
  return value === "learn" ? "learn" : "meeting";
}

export function normalizeVirtualClassroomLearnStage(
  value: unknown,
): VirtualClassroomLearnStage {
  return value === "activity" ? "activity" : "whiteboard";
}

export function normalizeVirtualClassroomLearnActivity(
  value: unknown,
): VirtualClassroomLearnActivity | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const activityId = typeof row.activityId === "string" ? row.activityId.trim() : "";
  const format = typeof row.format === "string" ? row.format.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const playPath = typeof row.playPath === "string" ? row.playPath.trim() : "";
  if (!activityId || !playPath) return null;
  return {
    activityId,
    format: format || "learning_track",
    title: title || "Activity",
    playPath,
  };
}

/** Defaults to true when missing (older rooms). */
export function normalizeLearnStudentPensEnabled(value: unknown): boolean {
  return value !== false;
}

export type VirtualClassroomRuntimeFields = {
  sessionId: string;
  joinCode: string;
  classId: string;
  hostUserId: string;
  title: string;
  status: "active" | "ended";
  /** Layout mode for everyone in the session (defaults to meeting when missing). */
  uiMode: VirtualClassroomUiMode;
  /** Shared Learn surface (defaults to whiteboard when missing). */
  learnStage: VirtualClassroomLearnStage;
  /** Studio / track activity shown on the Activity stage. */
  learnActivity: VirtualClassroomLearnActivity | null;
  /** Learn class board: when false, only the teacher can draw. */
  learnStudentPensEnabled: boolean;
  activeActivity: {
    kind: "whiteboard" | "document" | "word_cards" | null;
    joinCode: string | null;
    label: string | null;
    roundId?: string | null;
    roomId?: string | null;
  };
  announcement: string | null;
  endedAt: number | null;
  picker: StudentPickerState;
  groupSet: GroupSetState;
  timer: GlobalTimerState;
  randomiser: RandomiserState;
  points: SessionPointsState;
  classroomStatus: ClassroomStatusState;
};

export type VirtualClassroomMemberFields = {
  name: string;
  role: "host" | "member";
  joinedAt: number;
};

export function createVirtualClassroomInitialStorage(input: {
  sessionId: string;
  joinCode: string;
  classId: string;
  hostUserId: string;
  title: string;
}) {
  const runtime = new LiveObject<VirtualClassroomRuntimeFields>({
    sessionId: input.sessionId,
    joinCode: input.joinCode,
    classId: input.classId,
    hostUserId: input.hostUserId,
    title: input.title,
    status: "active",
    uiMode: "meeting",
    learnStage: "whiteboard",
    learnActivity: null,
    learnStudentPensEnabled: true,
    activeActivity: {
      kind: null,
      joinCode: null,
      label: null,
      roundId: null,
      roomId: null,
    },
    announcement: null,
    endedAt: null,
    picker: createEmptyPickerState([]),
    groupSet: createEmptyGroupSet(),
    timer: createIdleGlobalTimer(60_000),
    randomiser: createEmptyRandomiser(),
    points: createEmptySessionPoints(),
    classroomStatus: createEmptyClassroomStatus(),
  });

  return {
    runtime,
    members: new LiveMap<string, LiveObject<VirtualClassroomMemberFields>>(),
  };
}

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

/** Shared in-session layout: meeting = cameras + Daily fullscreen; learn = materials + docked video. */
export type VirtualClassroomUiMode = "meeting" | "learn";

export function normalizeVirtualClassroomUiMode(
  value: unknown,
): VirtualClassroomUiMode {
  return value === "meeting" ? "meeting" : "learn";
}

export type VirtualClassroomRuntimeFields = {
  sessionId: string;
  joinCode: string;
  classId: string;
  hostUserId: string;
  title: string;
  status: "active" | "ended";
  /** Layout mode for everyone in the session (defaults to learn when missing). */
  uiMode: VirtualClassroomUiMode;
  activeActivity: {
    kind: "whiteboard" | "document" | null;
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
    uiMode: "learn",
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

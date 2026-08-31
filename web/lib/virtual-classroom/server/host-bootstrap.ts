import "server-only";

import { randomBytes } from "node:crypto";
import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  classroomRealtimeNativeShellAuthorityReady,
  classroomRealtimeNativeShellPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";
import { createVirtualClassroomInitialStorage } from "@/lib/virtual-classroom/liveblocks/initial-storage";
import {
  classSessionIdFromJoinCode,
  toVirtualClassroomRoomId,
} from "@/lib/virtual-classroom/room-id";
import {
  encodeVcMemberToken,
  formatVcHostCookie,
} from "@/lib/virtual-classroom/session-cookie";
import { ensureVcMember } from "@/lib/virtual-classroom/server/liveblocks-session";
import {
  createInitialClassroomRuntimeSnapshot,
  seedClassroomRuntimeSnapshot,
} from "@/lib/virtual-classroom/server/runtime-snapshot";
import {
  createVirtualClassroomSession,
  updateVirtualClassroomSessionPhase,
} from "@/lib/virtual-classroom/server/session";

export type HostVirtualClassroomResult = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  classId: string | null;
  classLessonId: string | null;
  title: string;
  userId: string;
  displayName: string;
  role: "host";
  hostCookie: string;
  memberToken: string;
  /** Present when Daily is enabled and room attach succeeded. */
  dailyRoomUrl: string | null;
};

type EnsureHostRoomInput = {
  sessionId: string;
  joinCode: string;
  roomId: string;
  classId: string | null;
  title: string;
  teacher: { userId: string; displayName: string };
};

/**
 * Idempotently provision or repair the collaboration room behind a persisted
 * classroom session. A teacher reopening a valid session can therefore recover
 * from a partial first launch instead of being stranded on "room not found."
 */
export async function ensureVirtualClassroomHostRoom(
  input: EnsureHostRoomInput,
): Promise<void> {
  const secret = assertLiveblocksSecret();
  const liveblocks = new Liveblocks({ secret });
  await liveblocks.getOrCreateRoom(input.roomId, { defaultAccesses: [] });

  const initial = createVirtualClassroomInitialStorage({
    sessionId: input.sessionId,
    joinCode: input.joinCode,
    classId: input.classId ?? "",
    hostUserId: input.teacher.userId,
    title: input.title,
  });
  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(input.roomId, plain);
  } catch {
    // Expected when an already-initialized room is being reopened.
  }

  await ensureVcMember({
    roomId: input.roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
  });
}

/** Shared bootstrap for class-linked and one-off Virtual Classroom hosts. */
export async function bootstrapVirtualClassroomHost(input: {
  teacher: { userId: string; displayName: string };
  classId: string | null;
  classLessonId?: string | null;
  title?: string;
  meetingSlotId?: string | null;
  occurrenceStartsAt?: string | null;
  occurrenceEndsAt?: string | null;
  sessionKind?: "scheduled" | "extra";
  classPhase?: "prep" | "waiting" | "live" | "ended";
  /** When true, do not end other active sessions for the class (reuse path handles that). */
  skipEndOthers?: boolean;
}): Promise<HostVirtualClassroomResult> {
  const nativeSupabaseShellRequested =
    Boolean(input.classId) &&
    classroomRealtimeNativeShellPilotEnabled() &&
    classroomRealtimeNativeShellAuthorityReady();
  // Liveblocks remains the recovery transport when the native runtime cannot
  // be seeded. Validate it before persisting the session so a configuration
  // error cannot leave an active classroom with no usable room.
  assertLiveblocksSecret();
  const joinCode = generateJoinCode();
  const sessionId = classSessionIdFromJoinCode(joinCode);
  const roomId = toVirtualClassroomRoomId(joinCode);
  const hostSecret = randomBytes(24).toString("hex");
  const title =
    input.title?.trim() ||
    (input.classId ? "Virtual Classroom" : "One-off Virtual Classroom");
  const classLessonId = input.classId ? (input.classLessonId ?? null) : null;
  const sessionKind =
    input.sessionKind ??
    (input.classId && input.meetingSlotId ? "scheduled" : "extra");
  const classPhase = input.classPhase ?? "live";

  await createVirtualClassroomSession({
    id: sessionId,
    classId: input.classId,
    classLessonId,
    joinCode,
    liveblocksRoomId: roomId,
    title,
    createdBy: input.teacher.userId,
    meetingSlotId: input.meetingSlotId ?? null,
    occurrenceStartsAt: input.occurrenceStartsAt ?? null,
    occurrenceEndsAt: input.occurrenceEndsAt ?? null,
    sessionKind,
    classPhase,
  });

  // Phase-one Supabase migration: seed recovery state without changing the
  // current Liveblocks runtime transport.  A missing local migration must not
  // prevent a teacher from starting an existing classroom.
  const runtimeSeed = await seedClassroomRuntimeSnapshot(
    createInitialClassroomRuntimeSnapshot({
      sessionId,
      actorUserId: input.teacher.userId,
    }),
  );
  const nativeSupabaseShell = nativeSupabaseShellRequested && runtimeSeed.ok;

  if (!nativeSupabaseShell) {
    try {
      await ensureVirtualClassroomHostRoom({
        sessionId,
        joinCode,
        roomId,
        classId: input.classId,
        title,
        teacher: input.teacher,
      });
    } catch (error) {
      // Do not leave an active database session pointing at an unusable room.
      await updateVirtualClassroomSessionPhase(sessionId, "ended").catch(() => null);
      throw error;
    }
  }

  // Daily room creation is intentionally deferred to the token request. It no
  // longer blocks navigation into the classroom, and the SDK loads in parallel.
  const dailyRoomUrl: string | null = null;

  const memberToken = encodeVcMemberToken({
    sessionId,
    joinCode,
    roomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
  });

  return {
    sessionId,
    joinCode,
    roomId,
    classId: input.classId,
    classLessonId,
    title,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
    hostCookie: formatVcHostCookie(joinCode, hostSecret),
    memberToken,
    dailyRoomUrl,
  };
}

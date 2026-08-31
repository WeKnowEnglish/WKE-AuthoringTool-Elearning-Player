import "server-only";

import { randomBytes } from "node:crypto";
import {
  classroomRealtimeNativeShellAuthorityReady,
  classroomRealtimeNativeShellPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";
import {
  encodeVcMemberToken,
  formatVcHostCookie,
} from "@/lib/virtual-classroom/session-cookie";
import { ensureVirtualClassroomHostRoom } from "@/lib/virtual-classroom/server/host-bootstrap";
import { getClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";

/** Mint host/member cookies for an existing session (early open / reopen / ensure). */
export async function mintHostCookiesForSession(input: {
  session: VirtualClassroomSessionRecord;
  teacher: { userId: string; displayName: string };
}): Promise<{ hostCookie: string; memberToken: string }> {
  const nativeSupabaseShell =
    Boolean(input.session.classId) &&
    classroomRealtimeNativeShellPilotEnabled() &&
    classroomRealtimeNativeShellAuthorityReady() &&
    Boolean(await getClassroomRuntimeSnapshot(input.session.id));

  if (!nativeSupabaseShell) {
    await ensureVirtualClassroomHostRoom({
      sessionId: input.session.id,
      joinCode: input.session.joinCode,
      roomId: input.session.liveblocksRoomId,
      classId: input.session.classId,
      title: input.session.title,
      teacher: input.teacher,
    });
  }
  const hostSecret = randomBytes(24).toString("hex");
  return {
    hostCookie: formatVcHostCookie(input.session.joinCode, hostSecret),
    memberToken: encodeVcMemberToken({
      sessionId: input.session.id,
      joinCode: input.session.joinCode,
      roomId: input.session.liveblocksRoomId,
      userId: input.teacher.userId,
      displayName: input.teacher.displayName,
      role: "host",
    }),
  };
}

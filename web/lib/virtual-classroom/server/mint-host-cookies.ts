import "server-only";

import { randomBytes } from "node:crypto";
import {
  encodeVcMemberToken,
  formatVcHostCookie,
} from "@/lib/virtual-classroom/session-cookie";
import { ensureVcMember } from "@/lib/virtual-classroom/server/liveblocks-session";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";

/** Mint host/member cookies for an existing session (early open / reopen / ensure). */
export async function mintHostCookiesForSession(input: {
  session: VirtualClassroomSessionRecord;
  teacher: { userId: string; displayName: string };
}): Promise<{ hostCookie: string; memberToken: string }> {
  await ensureVcMember({
    roomId: input.session.liveblocksRoomId,
    userId: input.teacher.userId,
    displayName: input.teacher.displayName,
    role: "host",
  });
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

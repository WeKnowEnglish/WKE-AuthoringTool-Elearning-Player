import "server-only";

import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
} from "@/lib/virtual-classroom/session-cookie";

export type VirtualClassroomRuntimeReader = {
  role: "host" | "member";
  userId: string | null;
  displayName: string | null;
};

/**
 * Validates the session-scoped cookies already used for the Liveblocks room.
 * This deliberately does not accept a supplied role or user id from a browser.
 */
export function resolveVirtualClassroomRuntimeReader(input: {
  session: Pick<VirtualClassroomSessionRecord, "id" | "joinCode" | "liveblocksRoomId">;
  hostCookie: string | null | undefined;
  memberCookie: string | null | undefined;
}): VirtualClassroomRuntimeReader | null {
  const member = decodeVcMemberToken(input.memberCookie);
  if (
    member &&
    member.sessionId === input.session.id &&
    member.joinCode === input.session.joinCode &&
    member.roomId === input.session.liveblocksRoomId
  ) {
    return {
      role: member.role,
      userId: member.userId,
      displayName: member.displayName,
    };
  }

  if (vcHostMatchesJoinCode(input.hostCookie, input.session.joinCode)) {
    return { role: "host", userId: null, displayName: null };
  }

  return null;
}

import "server-only";
import { getAppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";

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

/** Recheck current account/ownership/enrollment before minting access or reading state. */
export async function authorizeVirtualClassroomRuntimeReader(input: {
  session: VirtualClassroomSessionRecord;
  hostCookie: string | null | undefined;
  memberCookie: string | null | undefined;
}): Promise<VirtualClassroomRuntimeReader | null> {
  if (input.session.status !== "active" || input.session.endedAt) return null;
  const reader = resolveVirtualClassroomRuntimeReader(input);
  if (!reader) return null;
  try {
    if (reader.role === "host") {
      const teacher = await requireVirtualClassroomSessionHost(input.session);
      if (reader.userId && reader.userId !== teacher.userId) return null;
      return { role: "host", userId: teacher.userId, displayName: teacher.displayName };
    }
    if (input.session.classId) {
      const student = await requireWhiteboardStudent(input.session.classId);
      if (student.userId !== reader.userId) return null;
      return { role: "member", userId: student.userId, displayName: student.displayName };
    }
    const auth = await createClient();
    const { data: { user }, error } = await auth.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") return null;
    if (user) {
      if (!getAppRole(user) || user.id !== reader.userId) return null;
    } else if (!reader.userId?.startsWith("guest-")) {
      return null;
    }
    return reader;
  } catch {
    return null;
  }
}

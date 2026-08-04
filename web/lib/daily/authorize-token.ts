import "server-only";

import { cookies } from "next/headers";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  evaluateSessionJoinability,
} from "@/lib/daily/join-window";
import type { DailyCallRole } from "@/lib/daily/types";
import { callRoleFromVcRole } from "@/lib/daily/tokens";
import { createClient } from "@/lib/supabase/server";
import type { VirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

export type DailyTokenAuthSuccess = {
  ok: true;
  userId: string;
  displayName: string;
  role: DailyCallRole;
};

export type DailyTokenAuthFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type DailyTokenAuthResult = DailyTokenAuthSuccess | DailyTokenAuthFailure;

/**
 * Authorize a short-lived Daily meeting token for an active VC session.
 * Host cookie or member cookie required; role matches authenticated identity.
 */
export async function authorizeDailyMeetingToken(
  session: VirtualClassroomSessionWithDaily,
): Promise<DailyTokenAuthResult> {
  const joinability = evaluateSessionJoinability({
    status: session.status,
    roomExpiresAt: session.dailyRoomExpiresAt,
  });
  if (!joinability.ok) {
    return {
      ok: false,
      status: 403,
      code: joinability.code,
      message: joinability.message,
    };
  }

  const cookieStore = await cookies();
  const hostOk = vcHostMatchesJoinCode(
    cookieStore.get(VC_HOST_COOKIE)?.value,
    session.joinCode,
  );
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const memberOk = member?.sessionId === session.id;

  if (!hostOk && !memberOk) {
    return {
      ok: false,
      status: 403,
      code: "not_authorized",
      message: "Join this Virtual Classroom session before connecting video.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prefer signed-in identity when present.
  if (user?.id) {
    if (hostOk) {
      try {
        const host = await requireVirtualClassroomSessionHost(session);
        if (host.userId !== user.id) {
          return {
            ok: false,
            status: 403,
            code: "not_host",
            message: "Only the session host can join video as teacher.",
          };
        }
        return {
          ok: true,
          userId: host.userId,
          displayName: host.displayName,
          role: "teacher",
        };
      } catch (error) {
        return {
          ok: false,
          status: 403,
          code: "not_host",
          message: error instanceof Error ? error.message : "Not authorized.",
        };
      }
    }

    // Member path: enrolled student for class-linked sessions.
    if (session.classId) {
      try {
        await requireWhiteboardStudent(session.classId);
      } catch (error) {
        return {
          ok: false,
          status: 403,
          code: "not_enrolled",
          message: error instanceof Error ? error.message : "Not enrolled.",
        };
      }
      if (!isStudent(user) && !isTeacher(user)) {
        return {
          ok: false,
          status: 403,
          code: "invalid_role",
          message: "Sign in as a student to join class video.",
        };
      }
      const displayName =
        (user.user_metadata?.display_name as string | undefined)?.trim() ||
        member?.displayName ||
        "Student";
      return {
        ok: true,
        userId: user.id,
        displayName,
        role: callRoleFromVcRole(member?.role === "host" ? "host" : "member", isTeacher(user)),
      };
    }

    // One-off: signed-in member from cookie.
    if (memberOk && member) {
      return {
        ok: true,
        userId: user.id,
        displayName:
          (user.user_metadata?.display_name as string | undefined)?.trim() ||
          member.displayName ||
          "Participant",
        role: callRoleFromVcRole(member.role, isTeacher(user)),
      };
    }
  }

  // Guest one-off (no Supabase user): member cookie only, guest Daily role.
  if (!session.classId && memberOk && member) {
    return {
      ok: true,
      userId: member.userId,
      displayName: member.displayName || "Guest",
      role: member.role === "host" ? "teacher" : "guest",
    };
  }

  return {
    ok: false,
    status: 401,
    code: "auth_required",
    message: "Sign in or join the session to connect video.",
  };
}

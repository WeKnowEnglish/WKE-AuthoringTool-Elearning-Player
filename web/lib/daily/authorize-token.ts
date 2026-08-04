import "server-only";

import { cookies } from "next/headers";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { evaluateSessionJoinability } from "@/lib/daily/join-window";
import { resolveDailyScheduleBind } from "@/lib/daily/schedule-bind";
import type { VirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import type { DailyCallRole } from "@/lib/daily/types";
import { callRoleFromVcRole } from "@/lib/daily/tokens";
import { createClient } from "@/lib/supabase/server";
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

type IdentityResult = DailyTokenAuthSuccess | DailyTokenAuthFailure;

async function resolveDailyIdentity(
  session: VirtualClassroomSessionWithDaily,
): Promise<IdentityResult> {
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
        role: callRoleFromVcRole(
          member?.role === "host" ? "host" : "member",
          isTeacher(user),
        ),
      };
    }

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

/**
 * Authorize a short-lived Daily meeting token for an active VC session.
 * Identity first, then schedule-aware join window (Phase 2b).
 */
export async function authorizeDailyMeetingToken(
  session: VirtualClassroomSessionWithDaily,
): Promise<DailyTokenAuthResult> {
  const identity = await resolveDailyIdentity(session);
  if (!identity.ok) return identity;

  const bind = await resolveDailyScheduleBind({
    classId: session.classId,
    createdAt: session.createdAt,
  });

  const joinability = evaluateSessionJoinability({
    status: session.status,
    endedAt: session.endedAt,
    roomExpiresAt: session.dailyRoomExpiresAt,
    scheduledStartsAt: bind?.live.startsAt ?? null,
    role: identity.role,
  });

  if (!joinability.ok) {
    return {
      ok: false,
      status: 403,
      code: joinability.code,
      message: joinability.message,
    };
  }

  return identity;
}

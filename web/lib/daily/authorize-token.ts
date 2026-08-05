import "server-only";

import { cookies } from "next/headers";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { evaluateSessionJoinability } from "@/lib/daily/join-window";
import { resolveDailyScheduleBind } from "@/lib/daily/schedule-bind";
import type { VirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import type { DailyCallRole } from "@/lib/daily/types";
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

/**
 * Session membership → Daily identity.
 * Teacher/owner requires a valid **signed** host cookie (never trust member.role).
 */
export async function resolveDailyIdentity(
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

  if (hostOk && user?.id) {
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

  // Host cookie without signed-in user: refuse teacher tokens (host bootstrap always signs in).
  if (hostOk && !user?.id) {
    return {
      ok: false,
      status: 401,
      code: "auth_required",
      message: "Sign in as the host to connect video as teacher.",
    };
  }

  if (user?.id && session.classId && memberOk) {
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
    // Enrolled participants are never Daily owners without host cookie.
    return {
      ok: true,
      userId: user.id,
      displayName,
      role: "student",
    };
  }

  if (user?.id && !session.classId && memberOk && member) {
    return {
      ok: true,
      userId: user.id,
      displayName:
        (user.user_metadata?.display_name as string | undefined)?.trim() ||
        member.displayName ||
        "Participant",
      // Signed member cookie still must not mint owner tokens without host cookie.
      role: "guest",
    };
  }

  if (!session.classId && memberOk && member) {
    return {
      ok: true,
      userId: member.userId,
      displayName: member.displayName || "Guest",
      role: "guest",
    };
  }

  return {
    ok: false,
    status: 401,
    code: "auth_required",
    message: "Sign in or join the session to connect video.",
  };
}

export type DailyAuthorizeOptions = {
  /** Skip schedule early-join (room metadata probe). */
  ignoreEarlyJoin?: boolean;
  /** Skip room expiry (provisional leave while still connected). */
  ignoreRoomExpiry?: boolean;
  /** Skip schedule bind lookup + join window entirely (identity only). */
  identityOnly?: boolean;
};

/**
 * Authorize a Daily participant. Default: full token join gate.
 */
export async function authorizeDailyMeetingToken(
  session: VirtualClassroomSessionWithDaily,
  options: DailyAuthorizeOptions = {},
): Promise<DailyTokenAuthResult> {
  const identity = await resolveDailyIdentity(session);
  if (!identity.ok) return identity;

  if (options.identityOnly) {
    return identity;
  }

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
    ignoreEarlyJoin: options.ignoreEarlyJoin,
    ignoreRoomExpiry: options.ignoreRoomExpiry,
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

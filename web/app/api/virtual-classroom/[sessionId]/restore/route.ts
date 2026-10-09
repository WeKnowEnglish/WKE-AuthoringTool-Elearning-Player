import { NextResponse } from "next/server";
import {
  encodeVcMemberToken,
  formatVcHostCookie,
  parseVcHostCookie,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { ensureVirtualClassroomHostRoom } from "@/lib/virtual-classroom/server/host-bootstrap";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";
import { authorizeVirtualClassroomRuntimeReader } from "@/lib/virtual-classroom/server/runtime-access";
import { ensureVcMember } from "@/lib/virtual-classroom/server/liveblocks-session";
import { getClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";
import {
  classroomRealtimeNativeShellAuthorityReady,
  classroomRealtimeNativeShellPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Restore the same active class from its URL using current account access. */
export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (session.status !== "active" || session.endedAt) {
    return NextResponse.json({ error: "Session has ended." }, { status: 410 });
  }

  const cookieStore = await cookies();
  let participant: { userId: string; displayName: string; role: "host" | "member" };
  try {
    participant = { ...await requireVirtualClassroomSessionHost(session), role: "host" };
  } catch {
    if (session.classId) {
      if (session.classPhase !== "waiting" && session.classPhase !== "live") {
        return NextResponse.json({ error: "Class is not open for students yet." }, { status: 403 });
      }
      try { participant = { ...await requireWhiteboardStudent(session.classId), role: "member" }; }
      catch { return NextResponse.json({ error: "Sign in with an account enrolled in this class." }, { status: 403 }); }
    } else {
      // Guests need their original signed membership; never create a new guest
      // identity or elevate a supplied user id during recovery.
      const reader = await authorizeVirtualClassroomRuntimeReader({ session,
        hostCookie: cookieStore.get(VC_HOST_COOKIE)?.value,
        memberCookie: cookieStore.get(VC_MEMBER_COOKIE)?.value });
      if (!reader?.userId || reader.role !== "member") return NextResponse.json({ error: "Rejoin this classroom first." }, { status: 403 });
      participant = { userId: reader.userId, displayName: reader.displayName ?? "Student", role: "member" };
    }
  }

  const nativeSupabaseShell =
    Boolean(session.classId) &&
    classroomRealtimeNativeShellPilotEnabled() &&
    classroomRealtimeNativeShellAuthorityReady() &&
    Boolean(await getClassroomRuntimeSnapshot(session.id));

  if (!nativeSupabaseShell) {
    try {
      if (participant.role === "host") await ensureVirtualClassroomHostRoom({
        sessionId: session.id,
        joinCode: session.joinCode,
        roomId: session.liveblocksRoomId,
        classId: session.classId,
        title: session.title,
        teacher: participant,
      });
      else await ensureVcMember({ roomId: session.liveblocksRoomId, ...participant });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Room unavailable.";
      return NextResponse.json({ error: message }, { status: 503 });
    }
  }

  const existingHost = cookieStore.get(VC_HOST_COOKIE)?.value;
  const parsedHost = parseVcHostCookie(existingHost);
  const hostSecret =
    parsedHost?.joinCode === session.joinCode.toUpperCase()
      ? parsedHost.hostSecret
      : randomBytes(24).toString("hex");

  const memberToken = encodeVcMemberToken({
    sessionId: session.id,
    joinCode: session.joinCode,
    roomId: session.liveblocksRoomId,
    userId: participant.userId,
    displayName: participant.displayName,
    role: participant.role,
  });

  const response = NextResponse.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    roomId: session.liveblocksRoomId,
    classId: session.classId,
    classLessonId: session.classLessonId,
    title: session.title,
    userId: participant.userId,
    displayName: participant.displayName,
    role: participant.role,
    landing: session.classPhase === "waiting" ? "waiting" : "live",
  });

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
  if (participant.role === "host") response.cookies.set(
    VC_HOST_COOKIE,
    formatVcHostCookie(session.joinCode, hostSecret),
    cookieOpts,
  );
  response.cookies.set(VC_MEMBER_COOKIE, memberToken, cookieOpts);
  return response;
}

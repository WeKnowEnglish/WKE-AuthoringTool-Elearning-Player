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
import { getClassroomRuntimeSnapshot } from "@/lib/virtual-classroom/server/runtime-snapshot";
import {
  classroomRealtimeNativeShellAuthorityReady,
  classroomRealtimeNativeShellPilotEnabled,
} from "@/lib/classroom-realtime/shadow-mode";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Teacher re-enters an active session (refresh cookies + client context payload). */
export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session has ended." }, { status: 410 });
  }

  let teacher: { userId: string; displayName: string };
  try {
    teacher = await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const nativeSupabaseShell =
    Boolean(session.classId) &&
    classroomRealtimeNativeShellPilotEnabled() &&
    classroomRealtimeNativeShellAuthorityReady() &&
    Boolean(await getClassroomRuntimeSnapshot(session.id));

  if (!nativeSupabaseShell) {
    try {
      await ensureVirtualClassroomHostRoom({
        sessionId: session.id,
        joinCode: session.joinCode,
        roomId: session.liveblocksRoomId,
        classId: session.classId,
        title: session.title,
        teacher,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Room unavailable.";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  const cookieStore = await cookies();
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
    userId: teacher.userId,
    displayName: teacher.displayName,
    role: "host",
  });

  const response = NextResponse.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    roomId: session.liveblocksRoomId,
    classId: session.classId,
    classLessonId: session.classLessonId,
    title: session.title,
    userId: teacher.userId,
    displayName: teacher.displayName,
    role: "host" as const,
  });

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
  response.cookies.set(
    VC_HOST_COOKIE,
    formatVcHostCookie(session.joinCode, hostSecret),
    cookieOpts,
  );
  response.cookies.set(VC_MEMBER_COOKIE, memberToken, cookieOpts);
  return response;
}

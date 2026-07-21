import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import {
  deleteLiveblocksRooms,
  markVcSessionEndedInStorage,
} from "@/lib/virtual-classroom/server/liveblocks-session";
import {
  endVirtualClassroomSession,
  getVirtualClassroomSessionById,
  listWhiteboardRoomsForClassSession,
} from "@/lib/virtual-classroom/server/session";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const hostOk = vcHostMatchesJoinCode(
    cookieStore.get(VC_HOST_COOKIE)?.value,
    session.joinCode,
  );
  if (!hostOk && member?.sessionId !== session.id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    roomId: session.liveblocksRoomId,
    classId: session.classId,
    classLessonId: session.classLessonId,
    title: session.title,
    status: session.status,
    endedAt: session.endedAt,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: { type?: string } = {};
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    body = {};
  }

  if (body.type !== "END_SESSION") {
    return NextResponse.json({ error: "Unknown command." }, { status: 400 });
  }

  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!vcHostMatchesJoinCode(cookieStore.get(VC_HOST_COOKIE)?.value, session.joinCode)) {
    return NextResponse.json({ error: "Host cookie required to end session." }, { status: 403 });
  }

  if (session.status === "ended") {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }

  await markVcSessionEndedInStorage(session.liveblocksRoomId);
  await endVirtualClassroomSession(session.id);

  const whiteboardRooms = await listWhiteboardRoomsForClassSession(session.id);
  await deleteLiveblocksRooms([session.liveblocksRoomId, ...whiteboardRooms]);

  const response = NextResponse.json({ ok: true, ended: true });
  response.cookies.set(VC_HOST_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(VC_MEMBER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

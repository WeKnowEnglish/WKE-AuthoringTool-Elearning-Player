import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureParticipantAndDocument } from "@/lib/document-activity/server/commands";
import { getDocumentRoundById } from "@/lib/document-activity/server/persistence";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { joinCodeFromDocumentVcSessionId } from "@/lib/document-activity/auth-policy";

type RouteContext = { params: Promise<{ roundId: string }> };

/**
 * Enter / restore a document round using Virtual Classroom cookies.
 * Creates the student document slot when missing (guests supported for one-off VC).
 */
export async function POST(request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  const round = await getDocumentRoundById(roundId);
  if (!round) {
    return NextResponse.json({ error: "Document round not found." }, { status: 404 });
  }
  if (round.phase === "completed") {
    return NextResponse.json({ error: "This document activity has ended." }, { status: 410 });
  }

  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Classroom session is not active." }, { status: 410 });
  }

  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(VC_HOST_COOKIE)?.value ?? null;
  const memberCookie = cookieStore.get(VC_MEMBER_COOKIE)?.value ?? null;
  const member = decodeVcMemberToken(memberCookie);
  const joinCode = joinCodeFromDocumentVcSessionId(session.id) ?? session.joinCode;

  const isHost = vcHostMatchesJoinCode(hostCookie, joinCode);
  const isMember =
    member?.sessionId === session.id &&
    member.joinCode.toUpperCase() === joinCode.toUpperCase();

  if (!isHost && !isMember) {
    return NextResponse.json(
      { error: "Join the Virtual Classroom first, then enter the document." },
      { status: 403 },
    );
  }

  let body: { displayName?: string; userId?: string; color?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const role = isHost && (!member || member.role === "host") ? "host" : "player";
  const userId =
    (member?.userId || body.userId?.trim() || (isHost ? session.createdBy : "")).trim();
  const displayName =
    (member?.displayName || body.displayName?.trim() || (role === "host" ? "Teacher" : "")).trim();

  if (!userId || !displayName) {
    return NextResponse.json({ error: "Missing user identity. Rejoin the classroom." }, { status: 400 });
  }

  const color = body.color?.trim() || (role === "host" ? "#0f172a" : "#0f766e");

  try {
    await ensureParticipantAndDocument({
      roomId: round.liveblocksRoomId,
      userId,
      displayName,
      color,
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not enter document.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({
    roundId: round.id,
    roomId: round.liveblocksRoomId,
    vcSessionId: session.id,
    joinCode: session.joinCode,
    classId: session.classId,
    phase: round.phase,
    userId,
    displayName,
    role,
  });
}

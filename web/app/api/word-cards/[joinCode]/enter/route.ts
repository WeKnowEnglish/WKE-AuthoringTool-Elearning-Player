import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  encodeWordCardsPlayerToken,
  WORD_CARDS_PLAYER_COOKIE,
} from "@/lib/word-cards/liveblocks/host-cookie";
import { ensureParticipantAndCard } from "@/lib/word-cards/server/commands";
import { getWordCardRoundByJoinCode } from "@/lib/word-cards/server/persistence";

type RouteContext = { params: Promise<{ joinCode: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { joinCode: rawCode } = await context.params;
  const joinCode = rawCode.toUpperCase();
  const round = await getWordCardRoundByJoinCode(joinCode);
  if (!round) {
    return NextResponse.json({ error: "Word cards round not found." }, { status: 404 });
  }
  if (round.phase === "completed") {
    return NextResponse.json({ error: "This word cards activity has ended." }, { status: 410 });
  }

  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Classroom session is not active." }, { status: 410 });
  }

  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(VC_HOST_COOKIE)?.value ?? null;
  const memberCookie = cookieStore.get(VC_MEMBER_COOKIE)?.value ?? null;
  const member = decodeVcMemberToken(memberCookie);
  const vcJoinCode = session.joinCode;

  const isHost = vcHostMatchesJoinCode(hostCookie, vcJoinCode);
  const isMember =
    member?.sessionId === session.id &&
    member.joinCode.toUpperCase() === vcJoinCode.toUpperCase();

  if (!isHost && !isMember) {
    return NextResponse.json(
      { error: "Join the Virtual Classroom first, then enter word cards." },
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
  const userId = (
    member?.userId ||
    body.userId?.trim() ||
    (isHost ? session.createdBy : "")
  ).trim();
  const displayName = (
    member?.displayName ||
    body.displayName?.trim() ||
    (role === "host" ? "Teacher" : "")
  ).trim();

  if (!userId || !displayName) {
    return NextResponse.json(
      { error: "Missing user identity. Rejoin the classroom." },
      { status: 400 },
    );
  }

  const color = body.color?.trim() || (role === "host" ? "#0f172a" : "#0f766e");

  try {
    await ensureParticipantAndCard({
      roomId: round.liveblocksRoomId,
      userId,
      displayName,
      color,
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not enter word cards.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  const playerToken = encodeWordCardsPlayerToken({
    roomId: round.liveblocksRoomId,
    joinCode: round.joinCode,
    userId,
    displayName,
    role,
  });

  const response = NextResponse.json({
    joinCode: round.joinCode,
    roundId: round.id,
    roomId: round.liveblocksRoomId,
    vcSessionId: session.id,
    classId: session.classId,
    phase: round.phase,
    userId,
    displayName,
    role,
  });

  response.cookies.set(WORD_CARDS_PLAYER_COOKIE, playerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

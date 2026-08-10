import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  decodeWordCardsPlayerToken,
  WORD_CARDS_PLAYER_COOKIE,
} from "@/lib/word-cards/liveblocks/host-cookie";
import {
  applyWordCardsStudentCommand,
  applyWordCardsTeacherCommand,
  type WordCardsStudentCommand,
  type WordCardsTeacherCommand,
} from "@/lib/word-cards/server/commands";
import { getWordCardRoundByJoinCode } from "@/lib/word-cards/server/persistence";

type RouteContext = { params: Promise<{ joinCode: string }> };

const TEACHER_TYPES = new Set([
  "OPEN",
  "ASSIGN_GROUPS",
  "COLLECT",
  "RETURN",
  "REVISE",
  "APPROVE_CARD",
  "EDIT_CARD",
  "SHOW",
  "COMPARE",
  "CLEAR_SHOW",
  "CLEAR_COMPARE",
  "SET_REVIEW_TASK",
  "REVEAL_RESULTS",
  "START_PLAY",
  "NEXT_PLAY_ITEM",
  "LOCK_PLAY_ANSWERS",
  "REVEAL_PLAY_RESULTS",
  "END_PLAY",
  "COMPLETE",
]);
const STUDENT_TYPES = new Set([
  "SUBMIT",
  "SELECT_PLAY_ANSWER",
  "SUBMIT_REVIEW",
  "SET_READY",
]);

export async function POST(request: Request, context: RouteContext) {
  const { joinCode: rawCode } = await context.params;
  const joinCode = rawCode.toUpperCase();
  const round = await getWordCardRoundByJoinCode(joinCode);
  if (!round) {
    return NextResponse.json({ error: "Word cards round not found." }, { status: 404 });
  }

  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(VC_HOST_COOKIE)?.value ?? null;
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const player = decodeWordCardsPlayerToken(
    cookieStore.get(WORD_CARDS_PLAYER_COOKIE)?.value,
  );
  const isHost =
    vcHostMatchesJoinCode(hostCookie, session.joinCode) ||
    (member?.sessionId === session.id && member.role === "host") ||
    (player?.roomId === round.liveblocksRoomId && player.role === "host");

  let body: { type?: string };
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.type) {
    return NextResponse.json({ error: "Missing command type." }, { status: 400 });
  }

  try {
    if (TEACHER_TYPES.has(body.type)) {
      if (!isHost) {
        return NextResponse.json({ error: "Teacher only." }, { status: 403 });
      }
      const result = await applyWordCardsTeacherCommand({
        roomId: round.liveblocksRoomId,
        roundId: round.id,
        sessionId: session.id,
        hostUserId: round.createdBy,
        command: body as WordCardsTeacherCommand,
      });

      if (body.type === "COMPLETE") {
        await setVcActiveActivity({
          roomId: session.liveblocksRoomId,
          sessionId: session.id,
          actorUserId: round.createdBy,
          kind: null,
          joinCode: null,
          label: null,
          roundId: null,
          activityRoomId: null,
        }).catch(() => undefined);
      }

      return NextResponse.json({ ok: true, phase: result.phase });
    }

    if (STUDENT_TYPES.has(body.type)) {
      const userId =
        (player?.roomId === round.liveblocksRoomId && player.role === "player"
          ? player.userId
          : null) ||
        (member?.sessionId === session.id && member.role !== "host" ? member.userId : null);
      if (!userId) {
        return NextResponse.json({ error: "Join word cards as a student first." }, { status: 403 });
      }
      if (isHost && player?.role === "host") {
        return NextResponse.json({ error: "Students submit their own cards." }, { status: 403 });
      }

      const result = await applyWordCardsStudentCommand({
        roomId: round.liveblocksRoomId,
        roundId: round.id,
        userId,
        command: body as WordCardsStudentCommand,
      });
      return NextResponse.json({ ok: true, status: result.status });
    }

    return NextResponse.json({ error: "Unsupported command." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

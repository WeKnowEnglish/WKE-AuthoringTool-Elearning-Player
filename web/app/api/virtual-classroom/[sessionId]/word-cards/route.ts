import { NextResponse } from "next/server";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  encodeWordCardsPlayerToken,
  WORD_CARDS_PLAYER_COOKIE,
} from "@/lib/word-cards/liveblocks/host-cookie";
import { launchWordCardsRound } from "@/lib/word-cards/server/launch";
import type { WordCardsParticipationMode } from "@/lib/word-cards/domain";

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  title?: string;
  instructions?: string;
  successCriteria?: string;
  wordList?: string | string[];
  participationMode?: WordCardsParticipationMode;
  timerMinutes?: number;
};

/** Launch a word-cards activity from any Virtual Classroom (class or one-off). */
export async function POST(request: Request, context: RouteContext) {
  const { sessionId: vcSessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(vcSessionId);
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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const launched = await launchWordCardsRound({
      session,
      teacher,
      title: body.title,
      instructions: body.instructions,
      successCriteria: body.successCriteria,
      wordList: body.wordList,
      participationMode: body.participationMode,
      timerMinutes: body.timerMinutes,
    });

    const playerToken = encodeWordCardsPlayerToken({
      roomId: launched.roomId,
      joinCode: launched.joinCode,
      userId: teacher.userId,
      displayName: teacher.displayName,
      role: "host",
    });

    const response = NextResponse.json({
      joinCode: launched.joinCode,
      roundId: launched.roundId,
      roomId: launched.roomId,
      vcSessionId: session.id,
      classId: session.classId,
      userId: teacher.userId,
      displayName: teacher.displayName,
      reused: launched.reused,
      label: launched.label,
      participationMode: launched.participationMode,
      groupsAssigned: launched.groupsAssigned,
    });

    response.cookies.set(WORD_CARDS_PLAYER_COOKIE, playerToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start word cards.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  encodeWhiteboardPlayerToken,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { pickStudentColor } from "@/lib/whiteboard/colors";
import {
  getClassIdForWhiteboardRoom,
  requireWhiteboardStudent,
} from "@/lib/whiteboard/product/access";
import { ensureParticipantAndBoard } from "@/lib/whiteboard/server/commands";
import { ensureStudentBoardRoom } from "@/lib/whiteboard/server/provision-rooms";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { getWhiteboardRoomStrategy } from "@/lib/whiteboard/rooms/strategy";

type Body = {
  joinCode?: string;
};

export async function POST(request: Request) {
  try {
    assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const joinCode = body.joinCode?.trim().toUpperCase() ?? "";
  if (!isValidJoinCode(joinCode)) {
    return NextResponse.json({ error: "Invalid join code." }, { status: 400 });
  }

  const roomId = toWhiteboardRoomId(joinCode);
  const classId = await getClassIdForWhiteboardRoom(roomId);
  if (!classId) {
    return NextResponse.json(
      { error: "This round is not linked to a class. Use the pilot join, or ask your teacher to start from a class." },
      { status: 404 },
    );
  }

  let student: { userId: string; displayName: string };
  try {
    student = await requireWhiteboardStudent(classId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  try {
    await ensureParticipantAndBoard({
      roomId,
      userId: student.userId,
      displayName: student.displayName,
      color: pickStudentColor(student.userId),
      role: "player",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join room.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  let boardRoomId: string | null = null;
  const roomStrategy = getWhiteboardRoomStrategy();
  if (roomStrategy === "per_board_rooms") {
    try {
      const liveblocks = getLiveblocksServerClient();
      let roundId = `round_${joinCode}`;
      let hostUserId = "teacher";
      let prompt = { title: "Whiteboard", instructions: "" };
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const runtime = (root as { get: (k: string) => { get: (k: string) => unknown } }).get(
          "runtime",
        );
        roundId = (runtime.get("roundId") as string) || roundId;
        hostUserId = (runtime.get("hostUserId") as string) || hostUserId;
        prompt = (runtime.get("prompt") as typeof prompt) || prompt;
      });
      boardRoomId = await ensureStudentBoardRoom({
        sessionId: joinCode,
        roundId,
        hostUserId,
        studentId: student.userId,
        prompt,
      });
    } catch {
      boardRoomId = null;
    }
  }

  const playerToken = encodeWhiteboardPlayerToken({
    roomId,
    sessionId: joinCode,
    userId: student.userId,
    displayName: student.displayName,
    role: "player",
  });

  const response = NextResponse.json({
    sessionId: joinCode,
    joinCode,
    roomId,
    classId,
    userId: student.userId,
    displayName: student.displayName,
    productMode: true,
    roomStrategy,
    boardRoomId,
  });

  response.cookies.set(WHITEBOARD_PLAYER_COOKIE, playerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

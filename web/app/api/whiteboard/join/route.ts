import { NextResponse } from "next/server";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  encodeWhiteboardPlayerToken,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { ensureParticipantAndBoard } from "@/lib/whiteboard/server/commands";

type JoinBody = {
  joinCode?: string;
  displayName?: string;
  userId?: string;
  color?: string;
};

export async function POST(request: Request) {
  try {
    assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = (body ?? {}) as JoinBody;
  const joinCode = record.joinCode?.trim().toUpperCase() ?? "";
  const displayName = record.displayName?.trim() ?? "";
  const userId = record.userId?.trim() ?? "";
  if (!isValidJoinCode(joinCode)) {
    return NextResponse.json({ error: "Invalid join code." }, { status: 400 });
  }
  if (!displayName || !userId) {
    return NextResponse.json({ error: "displayName and userId are required." }, { status: 400 });
  }

  const roomId = toWhiteboardRoomId(joinCode);
  const color = record.color?.trim() || "#0f766e";

  try {
    await ensureParticipantAndBoard({
      roomId,
      userId,
      displayName,
      color,
      role: "player",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join room.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  const playerToken = encodeWhiteboardPlayerToken({
    roomId,
    sessionId: joinCode,
    userId,
    displayName,
    role: "player",
  });

  const response = NextResponse.json({
    sessionId: joinCode,
    joinCode,
    roomId,
    userId,
    displayName,
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

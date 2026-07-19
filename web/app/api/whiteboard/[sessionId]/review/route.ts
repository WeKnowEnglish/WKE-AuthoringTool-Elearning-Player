import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeWhiteboardPlayerToken,
  whiteboardHostMatchesSession,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { applyStudentReviewResponse } from "@/lib/whiteboard/server/commands";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const roomId = toWhiteboardRoomId(sessionId.toUpperCase());
  const cookieStore = await cookies();
  const hostCookie = cookieStore.get(WHITEBOARD_HOST_COOKIE)?.value ?? null;
  const player = decodeWhiteboardPlayerToken(
    cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value,
  );

  const isHost =
    whiteboardHostMatchesSession(hostCookie, sessionId.toUpperCase()) ||
    (player?.roomId === roomId && player.role === "host");

  const userId = player?.userId;
  if (!userId && !isHost) {
    return NextResponse.json({ error: "Join the whiteboard first." }, { status: 403 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Student identity required." }, { status: 403 });
  }
  if (player && player.roomId !== roomId) {
    return NextResponse.json({ error: "Wrong session." }, { status: 403 });
  }

  let body: { choice?: string | null; note?: string };
  try {
    body = (await request.json()) as { choice?: string | null; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const result = await applyStudentReviewResponse({
    roomId,
    userId,
    choice: body.choice,
    note: body.note,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeWhiteboardPlayerToken,
  whiteboardHostMatchesSession,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Clone current round config into host response payload (client then calls /host). */
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
  if (!isHost) {
    return NextResponse.json({ error: "Teacher only." }, { status: 403 });
  }

  const liveblocks = getLiveblocksServerClient();
  const doc = await liveblocks.getStorageDocument(roomId, "json");
  const runtime = (doc as { data?: { runtime?: Record<string, unknown> } })?.data?.runtime
    ?? (doc as { runtime?: Record<string, unknown> }).runtime;

  if (!runtime) {
    return NextResponse.json({ error: "Round storage not found." }, { status: 404 });
  }

  const prompt = runtime.prompt as { title?: string; instructions?: string } | undefined;
  const settings = runtime.settings as { defaultTimerMs?: number } | undefined;
  const background = runtime.background as {
    url?: string | null;
    assetId?: string | null;
  } | undefined;

  return NextResponse.json({
    title: prompt?.title ?? "Whiteboard activity",
    instructions: prompt?.instructions ?? "",
    mode: runtime.mode ?? "individual",
    timerMinutes: Math.max(1, Math.round((settings?.defaultTimerMs ?? 240000) / 60000)),
    backgroundUrl: background?.url ?? null,
    backgroundAssetId: background?.assetId ?? null,
  });
}

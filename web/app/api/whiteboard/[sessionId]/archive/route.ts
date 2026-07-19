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
import { archiveWhiteboardRound } from "@/lib/whiteboard/server/audit";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
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
  let roundId = `round_${sessionId}`;
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const runtime = (root as { get: (k: string) => { get: (k: string) => unknown; set: (k: string, v: unknown) => void } }).get(
      "runtime",
    );
    roundId = (runtime.get("roundId") as string) || roundId;
    runtime.set("phase", "ENDED");
  });

  await archiveWhiteboardRound({ roundId, liveblocksRoomId: roomId });

  try {
    await liveblocks.deleteRoom(roomId);
  } catch {
    // Room delete may fail on free plan / permissions — archival still recorded.
  }

  return NextResponse.json({ ok: true, roundId, archived: true });
}

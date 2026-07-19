import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import {
  decodeWhiteboardPlayerToken,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { applyStudentSetReady } from "@/lib/whiteboard/server/commands";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withCollabServerTiming("whiteboard.ready", async (timer) => {
    const { sessionId } = await context.params;
    const roomId = toWhiteboardRoomId(sessionId.toUpperCase());
    timer.setContext({
      activity: "whiteboard",
      sessionId: sessionId.toUpperCase(),
      roomId,
      role: "player",
      commandType: "SET_READY",
    });

    const player = await timer.measure("auth", async () => {
      const cookieStore = await cookies();
      return decodeWhiteboardPlayerToken(
        cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value,
      );
    });

    if (!player || player.roomId !== roomId) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await timer.measure("parseBody", () => request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const ready = Boolean((body as { ready?: unknown }).ready);
    const result = await timer.measure("mutateStorage", () =>
      applyStudentSetReady({
        roomId,
        userId: player.userId,
        ready,
      }),
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ready });
  });
}

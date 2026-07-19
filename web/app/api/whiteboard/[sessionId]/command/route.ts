import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { createClient } from "@/lib/supabase/server";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  decodeWhiteboardPlayerToken,
  whiteboardHostMatchesSession,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { applyTeacherCommand } from "@/lib/whiteboard/server/commands";
import type { IncomingTeacherWhiteboardCommand } from "@/lib/whiteboard/server/normalize-command";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  return withCollabServerTiming("whiteboard.command", async (timer) => {
    const { sessionId } = await context.params;
    const roomId = toWhiteboardRoomId(sessionId.toUpperCase());
    timer.setContext({
      activity: "whiteboard",
      sessionId: sessionId.toUpperCase(),
      roomId,
      role: "host",
    });

    const { isHost, actorId } = await timer.measure("auth", async () => {
      const cookieStore = await cookies();
      const hostCookie = cookieStore.get(WHITEBOARD_HOST_COOKIE)?.value ?? null;
      const player = decodeWhiteboardPlayerToken(
        cookieStore.get(WHITEBOARD_PLAYER_COOKIE)?.value,
      );
      const hostOk =
        whiteboardHostMatchesSession(hostCookie, sessionId.toUpperCase()) ||
        (player?.roomId === roomId && player.role === "host");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return {
        isHost: hostOk,
        actorId: user?.id ?? player?.userId ?? undefined,
      };
    });

    if (!isHost) {
      return NextResponse.json({ error: "Teacher only." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await timer.measure("parseBody", () => request.json());
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const command = body as IncomingTeacherWhiteboardCommand;
    if (
      !command ||
      typeof command !== "object" ||
      typeof (command as { type?: string }).type !== "string"
    ) {
      return NextResponse.json({ error: "Invalid command." }, { status: 400 });
    }
    timer.setContext({ commandType: command.type });

    const result = await timer.measure("applyCommand", () =>
      applyTeacherCommand({ roomId, command, actorId }),
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const completed = command.type === "END_ROUND" || command.type === "COMPLETE";
    if (completed && result.vcSessionId) {
      await timer.measure("clearVcActivity", async () => {
        const session = await getVirtualClassroomSessionById(result.vcSessionId!);
        if (session) {
          await setVcActiveActivity({
            roomId: session.liveblocksRoomId,
            kind: null,
            joinCode: null,
            label: null,
            roundId: null,
            activityRoomId: null,
          }).catch(() => undefined);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      phase: result.phase,
      awardId: result.awardId,
    });
  });
}

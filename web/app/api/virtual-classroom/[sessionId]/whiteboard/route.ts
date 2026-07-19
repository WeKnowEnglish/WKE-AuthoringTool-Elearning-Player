import { NextResponse } from "next/server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  encodeWhiteboardPlayerToken,
  formatWhiteboardHostCookie,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { launchWhiteboardRound } from "@/lib/whiteboard/server/launch";
import type { WhiteboardMode } from "@/lib/whiteboard/domain";

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  title?: string;
  instructions?: string;
  timerMinutes?: number;
  worksheetPresetId?: string | null;
  mode?: WhiteboardMode;
};

/** Launch a whiteboard activity from any Virtual Classroom (class or one-off). */
export async function POST(request: Request, context: RouteContext) {
  return withCollabServerTiming("vc.launch_whiteboard", async (timer) => {
    const { sessionId: vcSessionId } = await context.params;
    timer.setContext({
      activity: "classroom",
      sessionId: vcSessionId,
      role: "host",
      commandType: "LAUNCH_WHITEBOARD",
    });

    const session = await timer.measure("loadSession", () =>
      getVirtualClassroomSessionById(vcSessionId),
    );
    if (!session) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (session.status !== "active") {
      return NextResponse.json({ error: "Session has ended." }, { status: 410 });
    }
    timer.setContext({
      roomId: session.liveblocksRoomId,
      classId: session.classId,
    });

    let teacher: { userId: string; displayName: string };
    try {
      teacher = await timer.measure("auth", () =>
        requireVirtualClassroomSessionHost(session),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    let body: Body = {};
    try {
      body = await timer.measure("parseBody", () => request.json() as Promise<Body>);
    } catch {
      body = {};
    }

    try {
      const launched = await timer.measure("launchRound", () =>
        launchWhiteboardRound({
          session,
          teacher,
          title: body.title,
          instructions: body.instructions,
          timerMinutes: body.timerMinutes,
          worksheetPresetId: body.worksheetPresetId,
          mode: body.mode,
        }),
      );

      const playerToken = encodeWhiteboardPlayerToken({
        roomId: launched.roomId,
        sessionId: launched.joinCode,
        userId: teacher.userId,
        displayName: teacher.displayName,
        role: "host",
      });

      const response = NextResponse.json({
        sessionId: launched.joinCode,
        joinCode: launched.joinCode,
        roomId: launched.roomId,
        roundId: launched.roundId,
        classSessionId: session.id,
        classId: session.classId,
        userId: teacher.userId,
        displayName: teacher.displayName,
        productMode: launched.productMode,
        reused: launched.reused,
        label: launched.label,
      });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      };
      response.cookies.set(
        WHITEBOARD_HOST_COOKIE,
        formatWhiteboardHostCookie(launched.joinCode, launched.hostSecret),
        cookieOpts,
      );
      response.cookies.set(WHITEBOARD_PLAYER_COOKIE, playerToken, cookieOpts);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start whiteboard.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

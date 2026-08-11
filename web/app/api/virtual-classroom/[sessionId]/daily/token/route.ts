import { NextResponse } from "next/server";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import { computeMeetingTokenExpUnix } from "@/lib/daily/join-window";
import { allowDailyTokenRequest } from "@/lib/daily/rate-limit";
import {
  getOrCreateDailyRoomForSession,
  getVirtualClassroomSessionWithDaily,
} from "@/lib/daily/session-room";
import { createDailyMeetingToken } from "@/lib/daily/tokens";
import { DailyApiError, DailyConfigError } from "@/lib/daily/types";
import { isDailyEnabled } from "@/lib/env/daily-server";
import { withCollabServerTiming } from "@/lib/collab-diagnostics/server-timing";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Issue a short-lived Daily meeting token for an authorized VC participant. */
export async function POST(_request: Request, context: RouteContext) {
  return withCollabServerTiming("vc.daily_token", async (timer) => {
  const { sessionId } = await context.params;
  timer.setContext({ activity: "classroom", sessionId });
  if (!isDailyEnabled()) {
    return NextResponse.json(
      { error: "Daily video is not enabled.", code: "daily_disabled" },
      { status: 503 },
    );
  }

  const session = await timer.measure("session_lookup", () =>
    getVirtualClassroomSessionWithDaily(sessionId),
  );
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await timer.measure("participant_authorization", () =>
    authorizeDailyMeetingToken(session),
  );
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, code: auth.code },
      { status: auth.status },
    );
  }

  if (!(await timer.measure("rate_limit", () => allowDailyTokenRequest(auth.userId, sessionId)))) {
    return NextResponse.json(
      {
        error: "Too many video token requests. Try again shortly.",
        code: "rate_limited",
      },
      { status: 429 },
    );
  }

  try {
    let roomName = session.dailyRoomName;
    let roomUrl = session.dailyRoomUrl;
    let roomExpiresAt = session.dailyRoomExpiresAt;

    if (!roomName || !roomUrl) {
      if (auth.role !== "teacher") {
        return NextResponse.json(
          { error: "Video room is not ready yet.", code: "room_missing" },
          { status: 404 },
        );
      }
      const room = await timer.measure("room_ensure", () =>
        getOrCreateDailyRoomForSession(sessionId),
      );
      if (!room) {
        return NextResponse.json(
          {
            error: "Daily video is not configured.",
            code: "daily_not_configured",
          },
          { status: 503 },
        );
      }
      roomName = room.name;
      roomUrl = room.url;
      roomExpiresAt = room.expiresAt;
    }

    const exp = computeMeetingTokenExpUnix({
      roomExpiresAt,
      sessionEnded: session.status === "ended" || Boolean(session.endedAt),
    });
    const token = await timer.measure("daily_api_token", () =>
      createDailyMeetingToken({
        roomName,
        roomUrl,
        userId: auth.userId,
        userName: auth.displayName,
        role: auth.role,
        exp,
      }),
    );

    return NextResponse.json({
      token: token.token,
      roomName: token.roomName,
      roomUrl: token.roomUrl,
      exp: token.exp,
      role: token.role,
    });
  } catch (error) {
    if (error instanceof DailyConfigError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 },
      );
    }
    if (error instanceof DailyApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not issue token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  });
}

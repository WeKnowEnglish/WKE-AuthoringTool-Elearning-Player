import { NextResponse } from "next/server";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import {
  getOrCreateDailyRoomForSession,
  getVirtualClassroomSessionWithDaily,
} from "@/lib/daily/session-room";
import { DailyApiError, DailyConfigError } from "@/lib/daily/types";
import { isDailyEnabled } from "@/lib/env/daily-server";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * GET: return existing Daily room metadata for an authorized session participant.
 * POST: host-only get-or-create (idempotent) when room was not attached at bootstrap.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  if (!isDailyEnabled()) {
    return NextResponse.json(
      { error: "Daily video is not enabled.", code: "daily_disabled" },
      { status: 503 },
    );
  }

  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await authorizeDailyMeetingToken(session);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, code: auth.code },
      { status: auth.status },
    );
  }

  if (!session.dailyRoomName || !session.dailyRoomUrl) {
    return NextResponse.json(
      { error: "Video room is not ready yet.", code: "room_missing" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    roomName: session.dailyRoomName,
    roomUrl: session.dailyRoomUrl,
    expiresAt: session.dailyRoomExpiresAt,
    transcriptionEnabled: session.transcriptionEnabled,
    recordingEnabled: session.recordingEnabled,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  if (!isDailyEnabled()) {
    return NextResponse.json(
      { error: "Daily video is not enabled.", code: "daily_disabled" },
      { status: 503 },
    );
  }

  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message, code: "not_host" }, { status: 403 });
  }

  try {
    const room = await getOrCreateDailyRoomForSession(sessionId);
    if (!room) {
      return NextResponse.json(
        { error: "Daily video is not configured.", code: "daily_not_configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      sessionId,
      roomName: room.name,
      roomUrl: room.url,
      expiresAt: room.expiresAt,
      createdAt: room.createdAt,
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
    const message = error instanceof Error ? error.message : "Could not create room.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  recordProvisionalAttendanceJoin,
  recordProvisionalAttendanceLeave,
} from "@/lib/daily/attendance";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import { allowDailyAttendanceRequest } from "@/lib/daily/rate-limit";
import { getVirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import { isDailyEnabled } from "@/lib/env/daily-server";

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  event?: "join" | "leave";
  dailyParticipantId?: string | null;
};

/**
 * Provisional browser-reported attendance.
 * Not authoritative until Daily webhooks verify membership.
 */
export async function POST(request: Request, context: RouteContext) {
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

  if (!allowDailyAttendanceRequest(auth.userId, sessionId)) {
    return NextResponse.json(
      {
        error: "Too many attendance events. Try again shortly.",
        code: "rate_limited",
      },
      { status: 429 },
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  if (body.event !== "join" && body.event !== "leave") {
    return NextResponse.json(
      { error: "event must be join or leave.", code: "invalid_event" },
      { status: 400 },
    );
  }

  try {
    if (body.event === "join") {
      await recordProvisionalAttendanceJoin({
        sessionId,
        participantKey: auth.userId,
        role: auth.role,
        dailyParticipantId: body.dailyParticipantId ?? null,
      });
    } else {
      await recordProvisionalAttendanceLeave({
        sessionId,
        participantKey: auth.userId,
      });
    }
    return NextResponse.json({ ok: true, provisional: true, event: body.event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record attendance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

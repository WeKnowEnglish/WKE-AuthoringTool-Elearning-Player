import { NextResponse } from "next/server";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import {
  recordLobbyAttendanceHeartbeat,
  recordLobbyAttendanceJoin,
  recordLobbyAttendanceLeave,
} from "@/lib/daily/attendance";
import { allowDailyAttendanceRequest } from "@/lib/daily/rate-limit";
import { getVirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { buildSessionAttendanceSummary } from "@/lib/virtual-classroom/server/attendance-summary";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ sessionId: string }> };

type PostBody = {
  event?: "join" | "heartbeat" | "leave";
};

/**
 * Lobby / app waiting-room presence (no Daily required).
 */
export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const auth = await authorizeDailyMeetingToken(session, { identityOnly: true });
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.message, code: auth.code },
      { status: auth.status },
    );
  }

  if (!(await allowDailyAttendanceRequest(auth.userId, sessionId))) {
    return NextResponse.json(
      {
        error: "Too many presence events. Try again shortly.",
        code: "rate_limited",
      },
      { status: 429 },
    );
  }

  let body: PostBody = {};
  try {
    body = (await request.json()) as PostBody;
  } catch {
    body = {};
  }

  if (body.event !== "join" && body.event !== "heartbeat" && body.event !== "leave") {
    return NextResponse.json(
      { error: "event must be join, heartbeat, or leave.", code: "invalid_event" },
      { status: 400 },
    );
  }

  try {
    if (body.event === "join") {
      await recordLobbyAttendanceJoin({
        sessionId,
        participantKey: auth.userId,
        role: auth.role,
      });
    } else if (body.event === "heartbeat") {
      await recordLobbyAttendanceHeartbeat({ sessionId, participantKey: auth.userId });
    } else {
      await recordLobbyAttendanceLeave({
        sessionId,
        participantKey: auth.userId,
      });
    }
    return NextResponse.json({ ok: true, surface: "lobby", event: body.event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not record lobby presence.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Teacher roster: enrolled students + lobby/video presence.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Not authorized." },
      { status: 403 },
    );
  }

  try {
    const summary = await buildSessionAttendanceSummary({
      sessionId,
      classId: session.classId?.trim() || null,
    });
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load attendance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

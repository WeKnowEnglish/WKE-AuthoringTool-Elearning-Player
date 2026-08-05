import { NextResponse } from "next/server";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import { getVirtualClassroomSessionWithDaily } from "@/lib/daily/session-room";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { getWaitingRoomState } from "@/lib/virtual-classroom/server/waiting-room-state";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Lightweight waiting-room status for students (teacher presence + lobby counts). */
export async function GET(_request: Request, context: RouteContext) {
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

  let occurrenceLabel: string | null = null;
  let autoLiveAt: string | null = null;
  if (session.classId) {
    const liveState = await getClassLiveState(session.classId);
    occurrenceLabel = liveState.occurrenceLabel;
    autoLiveAt = liveState.autoLiveAt;
  }

  const state = await getWaitingRoomState({
    sessionId,
    viewerUserId: auth.userId,
    occurrenceLabel,
    autoLiveAt,
  });

  if (!state) {
    return NextResponse.json({ error: "Session not active." }, { status: 404 });
  }

  return NextResponse.json(state);
}

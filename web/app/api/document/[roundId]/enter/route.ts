import { authorizeClassroomActivity } from "@/lib/virtual-classroom/server/activity-access";
import { NextResponse } from "next/server";
import { ensureParticipantAndDocument } from "@/lib/document-activity/server/commands";
import { getDocumentRoundById } from "@/lib/document-activity/server/persistence";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ roundId: string }> };

/**
 * Enter / restore a document round using Virtual Classroom cookies.
 * Creates the student document slot when missing (guests supported for one-off VC).
 */
export async function POST(request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  const round = await getDocumentRoundById(roundId);
  if (!round) {
    return NextResponse.json({ error: "Document round not found." }, { status: 404 });
  }

  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Classroom session is not active." }, { status: 410 });
  }

  let body: { displayName?: string; userId?: string; color?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  // A current host may reload to finish a failed completion confirmation.
  const participant = await authorizeClassroomActivity({ session, round, allowCompleted: true });
  if (!participant) {
    return NextResponse.json({ error: "Rejoin the classroom with an account that has current access." }, { status: 403 });
  }
  const role = participant.role === "host" ? "host" : "player";
  const userId = participant.userId;
  const displayName = participant.displayName;

  const color = body.color?.trim() || (role === "host" ? "#0f172a" : "#0f766e");

  try {
    if (round.phase !== "completed") await ensureParticipantAndDocument({
      roomId: round.liveblocksRoomId,
      userId,
      displayName,
      color,
      role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not enter document.";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({
    roundId: round.id,
    roomId: round.liveblocksRoomId,
    vcSessionId: session.id,
    joinCode: session.joinCode,
    classId: session.classId,
    phase: round.phase,
    userId,
    displayName,
    role,
  });
}

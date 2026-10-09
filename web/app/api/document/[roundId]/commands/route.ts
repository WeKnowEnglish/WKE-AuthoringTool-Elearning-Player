import { authorizeClassroomActivity } from "@/lib/virtual-classroom/server/activity-access";
import { confirmRoundStateSaved } from "@/lib/activity-runtime/server/round-save-state";
import { NextResponse } from "next/server";
import {
  applyDocumentStudentCommand,
  applyDocumentTeacherCommand,
  type DocumentStudentCommand,
  type DocumentTeacherCommand,
} from "@/lib/document-activity/server/commands";
import { getDocumentRoundById } from "@/lib/document-activity/server/persistence";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ roundId: string }> };

const TEACHER_TYPES = new Set([
  "OPEN",
  "SYNC_STATE",
  "COLLECT",
  "ASSIGN_GROUPS",
  "SHOW",
  "COMPARE",
  "CLEAR_SHOW",
  "CLEAR_COMPARE",
  "SET_REVIEW_TASK",
  "REVEAL_RESULTS",
  "RETURN",
  "REVISE",
  "COMPLETE",
]);
const STUDENT_TYPES = new Set(["SUBMIT", "SUBMIT_REVIEW", "SET_READY"]);

export async function POST(request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  const round = await getDocumentRoundById(roundId);
  if (!round) {
    return NextResponse.json({ error: "Document round not found." }, { status: 404 });
  }

  const session = await getVirtualClassroomSessionById(round.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  }

  let body: { type?: string };
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.type) {
    return NextResponse.json({ error: "Missing command type." }, { status: 400 });
  }

  const participant = await authorizeClassroomActivity({ session, round, allowCompleted: body.type === "COMPLETE" || body.type === "SYNC_STATE" });
  if (!participant) {
    return NextResponse.json({ error: "Current classroom access is required." }, { status: 403 });
  }

  try {
    if (TEACHER_TYPES.has(body.type)) {
      if (participant.role !== "host") {
        return NextResponse.json({ error: "Teacher only." }, { status: 403 });
      }
      const result = await applyDocumentTeacherCommand({
        roomId: round.liveblocksRoomId,
        roundId: round.id,
        sessionId: session.id,
        hostUserId: participant.userId,
        command: body as DocumentTeacherCommand,
        deferCompletionConfirmation: true,
      });

      if (result.phase === "completed") {
        await setVcActiveActivity({
          roomId: session.liveblocksRoomId,
          sessionId: session.id,
          classId: session.classId,
          actorUserId: participant.userId,
          kind: null,
          joinCode: null,
          label: null,
          roundId: null,
          activityRoomId: null,
        });
        await confirmRoundStateSaved(round.liveblocksRoomId);
      }

      return NextResponse.json({ ok: true, phase: result.phase });
    }

    if (STUDENT_TYPES.has(body.type)) {
      if (participant.role !== "member") {
        return NextResponse.json({ error: "Students submit their own work." }, { status: 403 });
      }
      const userId = participant.userId;

      const result = await applyDocumentStudentCommand({
        roomId: round.liveblocksRoomId,
        roundId: round.id,
        userId,
        command: body as DocumentStudentCommand,
      });
      return NextResponse.json({ ok: true, status: result.status });
    }

    return NextResponse.json({ error: "Unsupported command." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

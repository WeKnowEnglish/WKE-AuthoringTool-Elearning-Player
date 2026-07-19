import { NextResponse } from "next/server";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import type { DocumentGroupSubmitPolicy } from "@/lib/document-activity/domain";
import { launchDocumentRound } from "@/lib/document-activity/server/launch";
import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";

type RouteContext = { params: Promise<{ sessionId: string }> };

type Body = {
  title?: string;
  instructions?: string;
  successCriteria?: string;
  stimulus?: string;
  templateType?: DocumentTemplateType;
  participationMode?: DocumentParticipationMode;
  groupSubmitPolicy?: DocumentGroupSubmitPolicy;
  timerMinutes?: number;
  wordBank?: string[];
  sentenceStarters?: string[];
};

/** Launch a document activity from Virtual Classroom (single active round). */
export async function POST(request: Request, context: RouteContext) {
  const { sessionId: vcSessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(vcSessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session has ended." }, { status: 410 });
  }

  let teacher: { userId: string; displayName: string };
  try {
    teacher = await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const launched = await launchDocumentRound({
      session,
      teacher,
      title: body.title,
      instructions: body.instructions,
      successCriteria: body.successCriteria,
      stimulus: body.stimulus,
      templateType: body.templateType,
      participationMode: body.participationMode,
      groupSubmitPolicy: body.groupSubmitPolicy,
      timerMinutes: body.timerMinutes,
      wordBank: body.wordBank,
      sentenceStarters: body.sentenceStarters,
    });

    return NextResponse.json({
      roundId: launched.roundId,
      roomId: launched.roomId,
      joinCode: launched.joinCode,
      vcSessionId: launched.vcSessionId,
      classId: session.classId,
      label: launched.label,
      reused: launched.reused,
      participationMode: launched.participationMode,
      groupsAssigned: launched.groupsAssigned,
      userId: teacher.userId,
      displayName: teacher.displayName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isSecretRolePhase } from "@/lib/secret-roles/domain";
import {
  requireSecretRoleHost,
  secretRoleAccessResponse,
} from "@/lib/secret-roles/server/access";
import {
  assignSecretRoleLateJoiner,
  getSecretRoleHostView,
  transitionSecretRolePhase,
} from "@/lib/secret-roles/server/persistence";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";

type RouteContext = { params: Promise<{ roundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { roundId } = await context.params;
  try {
    const { session, teacher } = await requireSecretRoleHost(roundId);
    const body = (await request.json()) as { type?: unknown; phase?: unknown };
    if (body.type === "ASSIGN_LATE_JOINER") {
      const student = (body as { student?: { id?: unknown; displayName?: unknown } }).student;
      const id = typeof student?.id === "string" ? student.id.trim().slice(0, 160) : "";
      const displayName =
        typeof student?.displayName === "string" ? student.displayName.trim().slice(0, 120) : "";
      if (!id || !displayName) {
        return NextResponse.json({ error: "A student is required." }, { status: 400 });
      }
      return NextResponse.json(
        await assignSecretRoleLateJoiner({ roundId, student: { id, displayName } }),
      );
    }
    if (body.type !== "SET_PHASE" || !isSecretRolePhase(body.phase)) {
      return NextResponse.json({ error: "A valid Secret Roles command is required." }, { status: 400 });
    }
    const round = await transitionSecretRolePhase(roundId, body.phase);
    if (round.phase === "completed") {
      await setVcActiveActivity({
        roomId: session.liveblocksRoomId,
        sessionId: session.id,
        classId: session.classId,
        actorUserId: teacher.userId,
        kind: null,
        joinCode: null,
        label: null,
        roundId: null,
        activityRoomId: null,
      });
    }
    const view = await getSecretRoleHostView(roundId);
    return NextResponse.json(view);
  } catch (error) {
    return secretRoleAccessResponse(error);
  }
}

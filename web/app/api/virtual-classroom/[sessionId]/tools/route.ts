import { cookies } from "next/headers";
import { after } from "next/server";
import { NextResponse } from "next/server";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import {
  applyVcToolCommand,
  VC_MEMBER_TOOL_TYPES,
  type VcToolCommand,
} from "@/lib/virtual-classroom/server/tools";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { queueClassroomRuntimeSnapshotSync } from "@/lib/virtual-classroom/server/runtime-snapshot";
import { broadcastClassroomRealtimeEvent } from "@/lib/classroom-realtime/server/broadcast";
import type { ClassroomRuntimePatch } from "@/lib/classroom-realtime/types";
import { classroomRealtimeParticipantRegistryPilotEnabled } from "@/lib/classroom-realtime/shadow-mode";
import { listActiveClassroomStudentIds } from "@/lib/virtual-classroom/server/participant-registry";

type RouteContext = { params: Promise<{ sessionId: string }> };

function livePatchForCommand(command: VcToolCommand): ClassroomRuntimePatch | null {
  switch (command.type) {
    case "SET_UI_MODE":
      return { uiMode: command.mode === "meeting" ? "meeting" : "learn" };
    case "SET_LEARN_STAGE":
      return { learnStage: command.stage === "activity" ? "activity" : "whiteboard" };
    case "SET_LEARN_ACTIVITY":
      return { learnActivity: command.activity };
    case "SET_LEARN_STUDENT_PENS":
      return { learnStudentPensEnabled: command.enabled !== false };
    case "SET_ANNOUNCEMENT":
      return { announcement: command.message?.trim().slice(0, 280) || null };
    default:
      return null;
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session has ended." }, { status: 410 });
  }

  let command: VcToolCommand;
  try {
    command = (await request.json()) as VcToolCommand;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!command?.type) {
    return NextResponse.json({ error: "Command type required." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const hostOk = vcHostMatchesJoinCode(
    cookieStore.get(VC_HOST_COOKIE)?.value,
    session.joinCode,
  );
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const isHost = hostOk || member?.role === "host";
  const isMemberOfSession =
    member?.sessionId === sessionId || member?.joinCode === session.joinCode;

  let actorUserId: string | undefined;
  if (VC_MEMBER_TOOL_TYPES.has(command.type)) {
    if (!isHost && !isMemberOfSession) {
      return NextResponse.json({ error: "Join the session first." }, { status: 403 });
    }
    // Students may only set their own status; force studentId from cookie.
    if (command.type === "SET_OWN_STATUS" && !isHost) {
      if (!member?.userId) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      command = { ...command, studentId: member.userId };
    }
    actorUserId = member?.userId;
  } else {
    if (!isHost) {
      return NextResponse.json({ error: "Host only." }, { status: 403 });
    }
    try {
      const host = await requireVirtualClassroomSessionHost(session);
      actorUserId = host.userId;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  let activeStudentIds: string[] | undefined;
  if (classroomRealtimeParticipantRegistryPilotEnabled() && session.classId && !VC_MEMBER_TOOL_TYPES.has(command.type)) {
    try {
      const ids = await listActiveClassroomStudentIds(session.id);
      // Empty can mean a just-joined participant has not written attendance yet;
      // retain Liveblocks as the safe fallback until the registry is populated.
      if (ids.length) activeStudentIds = ids;
    } catch {
      // Retain Liveblocks fallback.
    }
  }

  const result = await applyVcToolCommand({
    roomId: session.liveblocksRoomId,
    sessionId: session.id,
    command,
    actorUserId,
    activeStudentIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  // The visible Liveblocks mutation has already completed. Mirror it after the
  // response so the teacher is never kept waiting on a second provider during
  // the shadow pilot. Student status is intentionally transient for now.
  if (command.type !== "SET_OWN_STATUS") {
    const mirrorActorId = actorUserId ?? "system";
    const commandPatch = livePatchForCommand(command);
    const livePatch: ClassroomRuntimePatch | null = result.changedTools
      ? { ...(commandPatch ?? {}), tools: result.changedTools }
      : commandPatch;
    after(async () => {
      await Promise.all([
        livePatch
          ? broadcastClassroomRealtimeEvent({
              type: "runtime:patch",
              sessionId: session.id,
              patch: livePatch,
              sentAt: Date.now(),
            })
          : Promise.resolve(false),
        queueClassroomRuntimeSnapshotSync({
          sessionId: session.id,
          roomId: session.liveblocksRoomId,
          actorUserId: mirrorActorId,
        }),
      ]);
    });
  }
  return NextResponse.json({ ok: true, detail: result.detail });
}

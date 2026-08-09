import { cookies } from "next/headers";
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

type RouteContext = { params: Promise<{ sessionId: string }> };

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

  const result = await applyVcToolCommand({
    roomId: session.liveblocksRoomId,
    sessionId: session.id,
    command,
    actorUserId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, detail: result.detail });
}

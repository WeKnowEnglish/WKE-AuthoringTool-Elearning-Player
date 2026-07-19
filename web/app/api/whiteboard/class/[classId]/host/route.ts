import { randomBytes } from "node:crypto";
import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { EMPTY_BACKGROUND, WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";
import { createWhiteboardInitialStorage } from "@/lib/whiteboard/liveblocks/initial-storage";
import {
  encodeWhiteboardPlayerToken,
  formatWhiteboardHostCookie,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";
import { createClassSession } from "@/lib/whiteboard/server/audit";
import { ensureParticipantAndBoard } from "@/lib/whiteboard/server/commands";
import { upsertRoundMeta } from "@/lib/whiteboard/server/persistence";
import { provisionLargeClassRooms } from "@/lib/whiteboard/server/provision-rooms";
import { getWhiteboardRoomStrategy } from "@/lib/whiteboard/rooms/strategy";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";

type RouteContext = { params: Promise<{ classId: string }> };

type Body = {
  title?: string;
  instructions?: string;
  timerMinutes?: number;
  worksheetPresetId?: string | null;
  mode?: "individual" | "group" | "teacher_demo";
  groupSubmitPolicy?: "any_member" | "leader_only" | "everyone_ready";
  /** When launched from an active VirtualClassroom session. */
  classSessionId?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { classId } = await context.params;

  let teacher: { userId: string; displayName: string };
  try {
    teacher = await requireWhiteboardTeacher(classId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  let secret: string;
  try {
    secret = assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const sessionId = generateJoinCode();
  const roomId = toWhiteboardRoomId(sessionId);
  const hostSecret = randomBytes(24).toString("hex");
  const roundId = `round_${sessionId}_${Date.now()}`;
  const timerMinutes = typeof body.timerMinutes === "number" ? body.timerMinutes : 4;
  const preset = WORKSHEET_PRESETS.find((p) => p.id === body.worksheetPresetId);
  const background = {
    ...EMPTY_BACKGROUND,
    assetId: preset?.id ?? null,
    url: preset?.url ?? null,
  };
  const title = body.title?.trim() || "Class whiteboard";
  const instructions =
    body.instructions?.trim() || "Use the tools. Submit when you are done.";

  let classSessionId = `cs_${sessionId}_${Date.now()}`;
  let vcRoomId: string | null = null;
  if (body.classSessionId?.trim()) {
    const vc = await getVirtualClassroomSessionById(body.classSessionId.trim());
    if (!vc || (vc.classId != null && vc.classId !== classId)) {
      return NextResponse.json({ error: "Virtual Classroom session not found." }, { status: 400 });
    }
    if (vc.status !== "active") {
      return NextResponse.json({ error: "Virtual Classroom session has ended." }, { status: 410 });
    }
    classSessionId = vc.id;
    vcRoomId = vc.liveblocksRoomId;
  } else {
    await createClassSession({
      sessionId: classSessionId,
      classId,
      title,
      createdBy: teacher.userId,
    });
  }

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  const initial = createWhiteboardInitialStorage({
    hostUserId: teacher.userId,
    joinCode: sessionId,
    roundId,
    mode: body.mode ?? "individual",
    prompt: { title, instructions },
    settings: {
      defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000,
      groupSubmitPolicy: body.groupSubmitPolicy ?? "any_member",
    },
    background,
    classId,
    sessionId: classSessionId,
    productMode: true,
  });

  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(roomId, plain);
  } catch {
    // client initialStorage fallback
  }

  await ensureParticipantAndBoard({
    roomId,
    userId: teacher.userId,
    displayName: teacher.displayName,
    color: "#0f172a",
    role: "host",
  });

  await upsertRoundMeta({
    roundId,
    liveblocksRoomId: roomId,
    joinCode: sessionId,
    hostUserId: teacher.userId,
    phase: "WAITING",
    mode: body.mode ?? "individual",
    prompt: { title, instructions },
    settings: {
      defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000,
      groupSubmitPolicy: body.groupSubmitPolicy ?? "any_member",
    },
    background,
    classId,
    sessionId: classSessionId,
    groupSubmitPolicy: body.groupSubmitPolicy ?? "any_member",
  }).catch(() => undefined);

  const roomStrategy = getWhiteboardRoomStrategy();
  const largeClass = await provisionLargeClassRooms({
    sessionId,
    roundId,
    hostUserId: teacher.userId,
    scopes: [{ type: "teacher" }],
    prompt: { title, instructions },
  }).catch(() => ({
    strategy: roomStrategy,
    controlRoomId: null as string | null,
    boardRoomIds: [] as string[],
  }));

  if (vcRoomId) {
    await setVcActiveActivity({
      roomId: vcRoomId,
      kind: "whiteboard",
      joinCode: sessionId,
      label: title,
    }).catch(() => undefined);
  }

  const playerToken = encodeWhiteboardPlayerToken({
    roomId,
    sessionId,
    userId: teacher.userId,
    displayName: teacher.displayName,
    role: "host",
  });

  const response = NextResponse.json({
    sessionId,
    joinCode: sessionId,
    roomId,
    roundId,
    classSessionId,
    classId,
    userId: teacher.userId,
    displayName: teacher.displayName,
    productMode: true,
    roomStrategy: largeClass.strategy,
    controlRoomId: largeClass.controlRoomId,
    boardRoomIds: largeClass.boardRoomIds,
  });

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  };
  response.cookies.set(
    WHITEBOARD_HOST_COOKIE,
    formatWhiteboardHostCookie(sessionId, hostSecret),
    cookieOpts,
  );
  response.cookies.set(WHITEBOARD_PLAYER_COOKIE, playerToken, cookieOpts);
  return response;
}

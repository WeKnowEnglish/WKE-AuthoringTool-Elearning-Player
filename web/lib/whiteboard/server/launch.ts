import "server-only";

import { randomBytes } from "node:crypto";
import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import type { ActiveActivityRef } from "@/lib/activity-runtime/active-activity-routing";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { EMPTY_BACKGROUND, WORKSHEET_PRESETS, type WhiteboardMode } from "@/lib/whiteboard/domain";
import { createWhiteboardInitialStorage } from "@/lib/whiteboard/liveblocks/initial-storage";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { ensureParticipantAndBoard } from "@/lib/whiteboard/server/commands";
import {
  getActiveWhiteboardRoundForSession,
  upsertRoundMeta,
} from "@/lib/whiteboard/server/persistence";

async function getVcActiveActivity(roomId: string): Promise<ActiveActivityRef | null> {
  const liveblocks = getLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    const runtime =
      (storage as { data?: { runtime?: Record<string, unknown> } })?.data?.runtime ??
      (storage as { runtime?: Record<string, unknown> }).runtime;
    const activity = runtime?.activeActivity as ActiveActivityRef | undefined;
    if (!activity || typeof activity !== "object") return null;
    return {
      kind: activity.kind ?? null,
      joinCode: activity.joinCode ?? null,
      label: activity.label ?? null,
      roundId: activity.roundId ?? null,
      roomId: activity.roomId ?? null,
    };
  } catch {
    return null;
  }
}

async function whiteboardRoomPhase(roomId: string): Promise<string | null> {
  const liveblocks = getLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    const runtime =
      (storage as { data?: { runtime?: Record<string, unknown> } })?.data?.runtime ??
      (storage as { runtime?: Record<string, unknown> }).runtime;
    return typeof runtime?.phase === "string" ? runtime.phase : null;
  } catch {
    return null;
  }
}

export type LaunchWhiteboardResult = {
  joinCode: string;
  roomId: string;
  roundId: string;
  vcSessionId: string;
  label: string;
  reused: boolean;
  hostSecret: string;
  mode: WhiteboardMode;
  productMode: boolean;
};

export async function launchWhiteboardRound(input: {
  session: VirtualClassroomSessionRecord;
  teacher: { userId: string; displayName: string };
  title?: string;
  instructions?: string;
  timerMinutes?: number;
  worksheetPresetId?: string | null;
  mode?: WhiteboardMode;
}): Promise<LaunchWhiteboardResult> {
  const title = input.title?.trim() || "Whiteboard activity";
  const hostSecret = randomBytes(24).toString("hex");
  const productMode = Boolean(input.session.classId);

  const existingActivity = await getVcActiveActivity(input.session.liveblocksRoomId);
  if (existingActivity?.kind === "whiteboard" && existingActivity.joinCode) {
    const roomId =
      existingActivity.roomId ?? toWhiteboardRoomId(existingActivity.joinCode);
    const phase = await whiteboardRoomPhase(roomId);
    if (phase && phase !== "ENDED") {
      await Promise.all([
        ensureParticipantAndBoard({
          roomId,
          userId: input.teacher.userId,
          displayName: input.teacher.displayName,
          color: "#0f172a",
          role: "host",
        }).catch(() => undefined),
        setVcActiveActivity({
          roomId: input.session.liveblocksRoomId,
          sessionId: input.session.id,
          actorUserId: input.teacher.userId,
          kind: "whiteboard",
          joinCode: existingActivity.joinCode,
          label: existingActivity.label ?? title,
          roundId: existingActivity.roundId ?? null,
          activityRoomId: roomId,
        }).catch(() => undefined),
      ]);
      return {
        joinCode: existingActivity.joinCode,
        roomId,
        roundId: existingActivity.roundId ?? `round_${existingActivity.joinCode}`,
        vcSessionId: input.session.id,
        label: existingActivity.label ?? title,
        reused: true,
        hostSecret,
        mode: input.mode ?? "individual",
        productMode,
      };
    }
  }

  const fromDb = await getActiveWhiteboardRoundForSession(input.session.id);
  if (fromDb) {
    await Promise.all([
      ensureParticipantAndBoard({
        roomId: fromDb.liveblocksRoomId,
        userId: input.teacher.userId,
        displayName: input.teacher.displayName,
        color: "#0f172a",
        role: "host",
      }).catch(() => undefined),
      setVcActiveActivity({
        roomId: input.session.liveblocksRoomId,
        sessionId: input.session.id,
        actorUserId: input.teacher.userId,
        kind: "whiteboard",
        joinCode: fromDb.joinCode,
        label: title,
        roundId: fromDb.id,
        activityRoomId: fromDb.liveblocksRoomId,
      }).catch(() => undefined),
    ]);
    return {
      joinCode: fromDb.joinCode,
      roomId: fromDb.liveblocksRoomId,
      roundId: fromDb.id,
      vcSessionId: input.session.id,
      label: title,
      reused: true,
      hostSecret,
      mode: input.mode ?? "individual",
      productMode,
    };
  }

  const secret = assertLiveblocksSecret();
  const joinCode = generateJoinCode();
  const roomId = toWhiteboardRoomId(joinCode);
  const roundId = `round_${joinCode}_${Date.now()}`;
  const timerMinutes =
    typeof input.timerMinutes === "number" && input.timerMinutes > 0
      ? input.timerMinutes
      : 4;
  const preset = WORKSHEET_PRESETS.find((p) => p.id === input.worksheetPresetId);
  const background = {
    ...EMPTY_BACKGROUND,
    assetId: preset?.id ?? null,
    url: preset?.url ?? null,
  };
  const instructions =
    input.instructions?.trim() || "Use the tools. Submit when you are done.";
  const mode = input.mode ?? "individual";

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, { defaultAccesses: [] });

  const initial = createWhiteboardInitialStorage({
    hostUserId: input.teacher.userId,
    joinCode,
    roundId,
    mode,
    prompt: { title, instructions },
    settings: {
      defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000,
    },
    background,
    classId: input.session.classId,
    sessionId: input.session.id,
    productMode,
  });

  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(roomId, plain);
  } catch {
    // client may initialize
  }

  // The host board membership and durable round record do not depend on one
  // another, so establish them together. We still publish the activity only
  // after metadata is available, preventing students from joining a route
  // whose lookup record has not been created yet.
  await Promise.all([
    ensureParticipantAndBoard({
      roomId,
      userId: input.teacher.userId,
      displayName: input.teacher.displayName,
      color: "#0f172a",
      role: "host",
    }),
    upsertRoundMeta({
      roundId,
      liveblocksRoomId: roomId,
      joinCode,
      hostUserId: input.teacher.userId,
      phase: "WAITING",
      mode,
      prompt: { title, instructions },
      settings: { defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000 },
      background,
      classId: input.session.classId ?? undefined,
      sessionId: input.session.id,
    }).catch(() => undefined),
  ]);

  await setVcActiveActivity({
    roomId: input.session.liveblocksRoomId,
    sessionId: input.session.id,
    actorUserId: input.teacher.userId,
    kind: "whiteboard",
    joinCode,
    label: title,
    roundId,
    activityRoomId: roomId,
  }).catch(() => undefined);

  return {
    joinCode,
    roomId,
    roundId,
    vcSessionId: input.session.id,
    label: title,
    reused: false,
    hostSecret,
    mode,
    productMode,
  };
}

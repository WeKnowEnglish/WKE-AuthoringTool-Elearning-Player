import { randomBytes } from "node:crypto";
import { Liveblocks } from "@liveblocks/node";
import { toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { LiveObject } from "@liveblocks/client";
import { NextResponse } from "next/server";
import { generateJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { createWhiteboardInitialStorage } from "@/lib/whiteboard/liveblocks/initial-storage";
import { EMPTY_BACKGROUND, WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";
import { upsertRoundMeta } from "@/lib/whiteboard/server/persistence";
import {
  encodeWhiteboardPlayerToken,
  formatWhiteboardHostCookie,
  WHITEBOARD_HOST_COOKIE,
  WHITEBOARD_PLAYER_COOKIE,
} from "@/lib/whiteboard/liveblocks/host-cookie";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";
import { ensureParticipantAndBoard } from "@/lib/whiteboard/server/commands";

type HostBody = {
  displayName?: string;
  userId?: string;
  title?: string;
  instructions?: string;
  mode?: "individual" | "group" | "teacher_demo";
  timerMinutes?: number;
  backgroundUrl?: string | null;
  backgroundAssetId?: string | null;
  worksheetPresetId?: string | null;
};

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const record = (body ?? {}) as HostBody;
  const displayName = record.displayName?.trim() || "Teacher";
  const userId = record.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  const sessionId = generateJoinCode();
  const roomId = toWhiteboardRoomId(sessionId);
  const hostSecret = randomBytes(24).toString("hex");
  const roundId = `round_${sessionId}_${Date.now()}`;
  const timerMinutes = typeof record.timerMinutes === "number" ? record.timerMinutes : 4;
  const preset = WORKSHEET_PRESETS.find((p) => p.id === record.worksheetPresetId);
  const background = {
    ...EMPTY_BACKGROUND,
    assetId: record.backgroundAssetId ?? preset?.id ?? null,
    url: record.backgroundUrl?.trim() || preset?.url || null,
  };

  const liveblocks = new Liveblocks({ secret });
  await liveblocks.createRoom(roomId, {
    defaultAccesses: [],
  });

  const initial = createWhiteboardInitialStorage({
    hostUserId: userId,
    joinCode: sessionId,
    roundId,
    mode: record.mode ?? "individual",
    prompt: {
      title: record.title?.trim() || "Draw your dream bedroom",
      instructions:
        record.instructions?.trim() ||
        "Use the pen and text tools. Submit when you are done.",
    },
    settings: {
      defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000,
    },
    background,
  });

  const root = new LiveObject(initial);
  const plain = toPlainLson(root) as PlainLsonObject;
  try {
    await liveblocks.initializeStorageDocument(roomId, plain);
  } catch {
    await liveblocks.mutateStorage(roomId, ({ root: storageRoot }) => {
      void storageRoot;
    });
  }

  await ensureParticipantAndBoard({
    roomId,
    userId,
    displayName,
    color: "#0f172a",
    role: "host",
  });

  await upsertRoundMeta({
    roundId,
    liveblocksRoomId: roomId,
    joinCode: sessionId,
    hostUserId: userId,
    phase: "WAITING",
    mode: record.mode ?? "individual",
    prompt: {
      title: record.title?.trim() || "Draw your dream bedroom",
      instructions:
        record.instructions?.trim() ||
        "Use the pen and text tools. Submit when you are done.",
    },
    settings: { defaultTimerMs: Math.max(30, timerMinutes) * 60 * 1000 },
    background,
  }).catch(() => undefined);
  const playerToken = encodeWhiteboardPlayerToken({
    roomId,
    sessionId,
    userId,
    displayName,
    role: "host",
  });

  const response = NextResponse.json({
    sessionId,
    joinCode: sessionId,
    roomId,
    userId,
    displayName,
    roundId,
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

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  formatHostCookieValue,
  LIVE_GAME_HOST_COOKIE_NAME,
} from "@/lib/live-game/liveblocks/host-cookie";
import { generateJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { getMapForMode, getModeConfig } from "@/lib/live-game/modes";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { LiveObject } from "@liveblocks/client";
import { createLiveGamePlayerToken, LIVE_GAME_PLAYER_COOKIE_NAME, liveGamePlayerCookieOptions } from "@/lib/live-game/server/player-session";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { createLiveGameInitialStorage } from "@/lib/live-game/liveblocks/initial-storage";
import { normalizeEnglishCraftDurationMinutes } from "@/lib/live-game/modes/english-craft/config";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import { createMovementState } from "@/lib/live-game/engine/movement";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { resolveHostQuestionSetBinding, HostQuestionSetInvalidError } from "@/lib/live-game/server/question-set-session";
import { QuestionSetNotFoundError, QuestionSetVersionMismatchError } from "@/lib/live-game/server/question-set-resolver";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

type HostRequestBody = {
  displayName?: string;
  modeId?: string;
  durationMinutes?: number;
  avatarId?: string;
  questionSetId?: string;
  classId?: string | null;
};

function parseHostRequestBody(
  body: unknown,
): {
  displayName: string;
  modeId: LiveGameModeId;
  durationMinutes: number;
  avatarId: string;
  questionSetInput: string | undefined;
  classId: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as HostRequestBody;
  const displayName = record.displayName?.trim() ?? "";
  const modeId = record.modeId === "english_craft" ? "english_craft" : null;
  const durationMinutes =
    typeof record.durationMinutes === "number" && record.durationMinutes > 0 ?
      Math.min(60, Math.round(record.durationMinutes))
    : 20;
  if (!displayName || !modeId) return null;
  return {
    displayName,
    modeId,
    durationMinutes,
    avatarId: toLiveGameCharacterId(record.avatarId ?? ""),
    questionSetInput: record.questionSetId,
    classId: typeof record.classId === "string" && record.classId.trim() ? record.classId.trim() : null,
  };
}

async function handlePost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  }
  try {
    assertLiveblocksSecret();
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

  const parsed = parseHostRequestBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "displayName and modeId are required." },
      { status: 400 },
    );
  }

  const mode = getModeConfig(parsed.modeId);
  let questionSetBinding;
  try {
    questionSetBinding = await resolveHostQuestionSetBinding(parsed.questionSetInput);
  } catch (error) {
    if (error instanceof HostQuestionSetInvalidError) {
      return NextResponse.json({ error: "Unknown question set." }, { status: 400 });
    }
    if (error instanceof QuestionSetNotFoundError) {
      return NextResponse.json({ error: "Question set not found." }, { status: 404 });
    }
    if (error instanceof QuestionSetVersionMismatchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
  let linkedClass: { id: string; title: string } | null = null;
  if (parsed.classId) {
    const { data: teacherClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id,title")
      .eq("id", parsed.classId)
      .eq("teacher_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (classError) {
      console.error("Could not validate Live Game class ownership", classError);
      return NextResponse.json({ error: "Could not validate the selected class." }, { status: 503 });
    }
    if (!teacherClass) {
      return NextResponse.json({ error: "Select one of your active classes." }, { status: 400 });
    }
    linkedClass = { id: teacherClass.id as string, title: teacherClass.title as string };
  }
  const sessionId = generateJoinCode();
  const hostSecret = randomBytes(24).toString("hex");
  const hostPlayerId = user.id;
  const roomId = toRoomId(sessionId);

  const liveblocks = getLiveblocksServerClient();
  await liveblocks.createRoom(roomId, { defaultAccesses: [] }, { idempotent: true });
  const initial = createLiveGameInitialStorage({
    hostUserId: hostPlayerId,
    classId: linkedClass?.id ?? null,
    classTitle: linkedClass?.title ?? null,
    joinCode: sessionId,
    modeId: parsed.modeId,
    mapId: mode.defaultMapId,
    durationMinutes: normalizeEnglishCraftDurationMinutes(parsed.durationMinutes),
    questionSetId: questionSetBinding.setId,
    questionSetVersion: questionSetBinding.version,
  });
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const liveRoot = root as unknown as { set(key: string, value: unknown): void; get(key: string): unknown };
    for (const [key, value] of Object.entries(initial)) liveRoot.set(key, value);
    const players = liveRoot.get("players") as typeof initial.players;
    players.set(hostPlayerId, new LiveObject({
      name: parsed.displayName,
      color: "#64748b",
      role: "host",
      isReady: true,
      joinedAt: Date.now(),
      avatarId: parsed.avatarId,
    }));
    const spawn = createMovementState(getMapForMode(mode.defaultMapId, parsed.modeId), 0);
    const positions = liveRoot.get("playerPositions") as import("@liveblocks/client").LiveMap<string, LiveObject<{ x: number; y: number; updatedAt: number }>>;
    positions.set(hostPlayerId, new LiveObject({ ...spawn, updatedAt: Date.now() }));
  });

  const response = NextResponse.json({
    sessionId,
    joinCode: sessionId,
    roomId,
    userId: hostPlayerId,
    displayName: parsed.displayName,
    modeId: parsed.modeId,
    mapId: mode.defaultMapId,
    durationMinutes: parsed.durationMinutes,
    questionSetId: questionSetBinding.setId,
    questionSetVersion: questionSetBinding.version,
  });

  response.cookies.set(
    LIVE_GAME_HOST_COOKIE_NAME,
    formatHostCookieValue(sessionId, hostSecret),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );
  response.cookies.set(
    LIVE_GAME_PLAYER_COOKIE_NAME,
    createLiveGamePlayerToken({
      roomId,
      playerId: hostPlayerId,
      role: "host",
      displayName: parsed.displayName,
      accountType: "authenticated",
      accountUserId: user.id,
    }),
    liveGamePlayerCookieOptions(),
  );

  return response;
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_host_create", () => handlePost(request));
}

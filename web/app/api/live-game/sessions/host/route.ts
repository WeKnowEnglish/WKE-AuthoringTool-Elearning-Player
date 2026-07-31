import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  formatHostCookieValue,
  LIVE_GAME_HOST_COOKIE_NAME,
} from "@/lib/live-game/liveblocks/host-cookie";
import { generateJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { getModeConfig } from "@/lib/live-game/modes";
import { getLiveGameModule, isLiveGameModeId } from "@/lib/live-game/modes/registry";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  createLiveGamePlayerToken,
  LIVE_GAME_PLAYER_COOKIE_NAME,
  liveGamePlayerCookieOptions,
} from "@/lib/live-game/server/player-session";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { normalizeEnglishCraftDurationMinutes } from "@/lib/live-game/modes/english-craft/config";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import { isTeacher, canHostLive } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  resolveHostQuestionSetBinding,
  HostQuestionSetInvalidError,
} from "@/lib/live-game/server/question-set-session";
import {
  QuestionSetNotFoundError,
  QuestionSetVersionMismatchError,
} from "@/lib/live-game/server/question-set-resolver";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import {
  bootstrapLiveGameHostStorage,
  findHostRoomByCreationId,
  hostRoomMetadata,
  isValidHostCreationId,
  markHostRoomInitStatus,
  type HostBootstrapResult,
} from "@/lib/live-game/server/host-room-bootstrap";

type HostRequestBody = {
  displayName?: string;
  modeId?: string;
  durationMinutes?: number;
  avatarId?: string;
  questionSetId?: string;
  classId?: string | null;
  creationId?: string;
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
  creationId: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as HostRequestBody;
  const displayName = record.displayName?.trim() ?? "";
  const modeId = typeof record.modeId === "string" && isLiveGameModeId(record.modeId) ? record.modeId : null;
  const durationMinutes =
    typeof record.durationMinutes === "number" && record.durationMinutes > 0 ?
      Math.min(60, Math.round(record.durationMinutes))
    : 20;
  if (
    !displayName ||
    !modeId ||
    getLiveGameModule(modeId).status !== "available" ||
    !isValidHostCreationId(record.creationId)
  ) return null;
  return {
    displayName,
    modeId,
    durationMinutes,
    avatarId: toLiveGameCharacterId(record.avatarId ?? ""),
    questionSetInput: record.questionSetId,
    classId: typeof record.classId === "string" && record.classId.trim() ? record.classId.trim() : null,
    creationId: record.creationId,
  };
}

function hostSuccessResponse(input: {
  sessionId: string;
  roomId: string;
  userId: string;
  displayName: string;
  modeId: LiveGameModeId;
  mapId: string;
  durationMinutes: number;
  questionSetId: string;
  questionSetVersion: number;
  classId: string | null;
  classTitle: string | null;
  hostSecret: string;
}) {
  const response = NextResponse.json({
    sessionId: input.sessionId,
    joinCode: input.sessionId,
    roomId: input.roomId,
    userId: input.userId,
    displayName: input.displayName,
    modeId: input.modeId,
    mapId: input.mapId,
    durationMinutes: input.durationMinutes,
    questionSetId: input.questionSetId,
    questionSetVersion: input.questionSetVersion,
    classId: input.classId,
    classTitle: input.classTitle,
  });

  response.cookies.set(
    LIVE_GAME_HOST_COOKIE_NAME,
    formatHostCookieValue(input.sessionId, input.hostSecret),
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
      roomId: input.roomId,
      playerId: input.userId,
      role: "host",
      displayName: input.displayName,
      accountType: "authenticated",
      accountUserId: input.userId,
    }),
    liveGamePlayerCookieOptions(),
  );
  return response;
}

function applyBootstrapDiagnostics(
  timer: LiveGameServerTimer,
  input: {
    roomId: string;
    sessionId: string;
    creationId: string;
    idempotencyOutcome: string;
    roomAlreadyExisted: boolean;
    cleanupOutcome: string | null;
    questionBundleBindingStrategy: string;
    bootstrap: HostBootstrapResult | null;
    liveblocksCallCount: number;
    liveblocksReadCount: number;
  },
) {
  timer.setContext({
    roomId: input.roomId,
    sessionId: input.sessionId,
    role: "host",
    routeType: "host",
    idempotencyOutcome: input.idempotencyOutcome,
    liveblocksCallCount: input.liveblocksCallCount,
    liveblocksReadCount: input.liveblocksReadCount,
    liveblocksMutateCount: input.bootstrap?.liveblocksMutateCount ?? 0,
    responseStrategy: input.bootstrap?.initializationStrategy ?? "reused_existing",
    correctnessSource: input.bootstrap?.fallbackReason ?? undefined,
  });
  // Extra host-specific fields flow through structured server timing logs via setContext
  // and the HTTP payload is unchanged; detailed fields are also logged below.
  console.info(
    JSON.stringify({
      type: "live_game_host_room_create_detail",
      roomId: input.roomId,
      sessionId: input.sessionId,
      creationIdHash: input.creationId.slice(0, 8),
      idempotencyOutcome: input.idempotencyOutcome,
      roomAlreadyExisted: input.roomAlreadyExisted,
      cleanupOutcome: input.cleanupOutcome,
      questionBundleBindingStrategy: input.questionBundleBindingStrategy,
      liveblocksCallCount: input.liveblocksCallCount,
      liveblocksReadCount: input.liveblocksReadCount,
      liveblocksMutateCount: input.bootstrap?.liveblocksMutateCount ?? 0,
      initializationStrategy: input.bootstrap?.initializationStrategy ?? "reused_existing",
      fallbackReason: input.bootstrap?.fallbackReason ?? null,
      initialStorageBytes: input.bootstrap?.initialStorageBytes ?? null,
      topLevelStorageFieldCount: input.bootstrap?.topLevelStorageFieldCount ?? null,
      topLevelStorageFieldBytes: input.bootstrap?.topLevelStorageFieldBytes ?? null,
      serializationMs: input.bootstrap?.serializationMs ?? null,
      mutateRequestBytes: input.bootstrap?.mutateRequestBytes ?? null,
      hostPlayerCountAfter: input.bootstrap?.hostPlayerCountAfter ?? null,
    }),
  );
}

async function handlePost(request: Request, timer: LiveGameServerTimer) {
  timer.setContext({ role: "host", routeType: "host" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await timer.measure("auth", () => supabase.auth.getUser());
  if (!user || !isTeacher(user)) {
    return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  }
  if (!canHostLive(user)) {
    return NextResponse.json({ error: "Live hosting requires Teacher Plus." }, { status: 403 });
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
      { error: "displayName, modeId, and a valid creationId are required." },
      { status: 400 },
    );
  }

  const mode = getModeConfig(parsed.modeId);
  let questionSetBinding;
  try {
    questionSetBinding = await timer.measure("supabase_query", () =>
      resolveHostQuestionSetBinding(parsed.questionSetInput),
    );
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
    const { data: teacherClass, error: classError } = await timer.measure("supabase_query", () =>
      supabase
        .from("teacher_classes")
        .select("id,title")
        .eq("id", parsed.classId)
        .eq("teacher_id", user.id)
        .is("archived_at", null)
        .maybeSingle(),
    );
    if (classError) {
      console.error("Could not validate Live Game class ownership", classError);
      return NextResponse.json({ error: "Could not validate the selected class." }, { status: 503 });
    }
    if (!teacherClass) {
      return NextResponse.json({ error: "Select one of your active classes." }, { status: 400 });
    }
    linkedClass = { id: teacherClass.id as string, title: teacherClass.title as string };
  }

  const hostPlayerId = user.id;
  const hostSecret = randomBytes(24).toString("hex");
  const liveblocks = getLiveblocksServerClient();
  let liveblocksCallCount = 0;
  let liveblocksReadCount = 0;
  let cleanupOutcome: string | null = null;

  const existing = await timer.measure("liveblocks_room_lookup", async () => {
    liveblocksCallCount += 1;
    return findHostRoomByCreationId({
      teacherId: hostPlayerId,
      creationId: parsed.creationId,
    });
  });

  if (existing) {
    liveblocksReadCount += 1;
    const storage = await timer.measure("liveblocks_read", () =>
      readLiveGameStorageJson(existing.roomId),
    );
    const hostPresent = Boolean(storage?.players?.[hostPlayerId]);
    const ready =
      existing.initStatus === "ready" &&
      storage?.session?.phase === "lobby" &&
      hostPresent;

    if (ready) {
      timer.setContext({ roomId: existing.roomId, sessionId: existing.joinCode });
      applyBootstrapDiagnostics(timer, {
        roomId: existing.roomId,
        sessionId: existing.joinCode,
        creationId: parsed.creationId,
        idempotencyOutcome: "reused_ready_room",
        roomAlreadyExisted: true,
        cleanupOutcome: null,
        questionBundleBindingStrategy: "session_binding_in_storage",
        bootstrap: null,
        liveblocksCallCount,
        liveblocksReadCount,
      });
      return hostSuccessResponse({
        sessionId: existing.joinCode,
        roomId: existing.roomId,
        userId: hostPlayerId,
        displayName: parsed.displayName,
        modeId: parsed.modeId,
        mapId: mode.defaultMapId,
        durationMinutes: parsed.durationMinutes,
        questionSetId: questionSetBinding.setId,
        questionSetVersion: questionSetBinding.version,
        classId: linkedClass?.id ?? storage?.session?.classId ?? null,
        classTitle: linkedClass?.title ?? storage?.session?.classTitle ?? null,
        hostSecret,
      });
    }

    // Room exists but Storage is incomplete — finish bootstrap without creating another room.
    const bootstrap = await timer.measure("liveblocks_storage_init", () =>
      bootstrapLiveGameHostStorage({
        roomId: existing.roomId,
        hostUserId: hostPlayerId,
        displayName: parsed.displayName,
        avatarId: parsed.avatarId,
        classId: linkedClass?.id ?? null,
        classTitle: linkedClass?.title ?? null,
        joinCode: existing.joinCode,
        modeId: parsed.modeId,
        mapId: mode.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(parsed.durationMinutes),
        questionSetId: questionSetBinding.setId,
        questionSetVersion: questionSetBinding.version,
      }),
    );
    liveblocksCallCount += bootstrap.liveblocksInitCount + bootstrap.liveblocksMutateCount;
    await timer.measure("liveblocks_room_update", async () => {
      liveblocksCallCount += 1;
      await markHostRoomInitStatus(existing.roomId, "ready");
    });
    applyBootstrapDiagnostics(timer, {
      roomId: existing.roomId,
      sessionId: existing.joinCode,
      creationId: parsed.creationId,
      idempotencyOutcome: "resumed_incomplete_room",
      roomAlreadyExisted: true,
      cleanupOutcome: null,
      questionBundleBindingStrategy: "resolved_during_host_create",
      bootstrap,
      liveblocksCallCount,
      liveblocksReadCount,
    });
    return hostSuccessResponse({
      sessionId: existing.joinCode,
      roomId: existing.roomId,
      userId: hostPlayerId,
      displayName: parsed.displayName,
      modeId: parsed.modeId,
      mapId: mode.defaultMapId,
      durationMinutes: parsed.durationMinutes,
      questionSetId: questionSetBinding.setId,
      questionSetVersion: questionSetBinding.version,
      classId: linkedClass?.id ?? null,
      classTitle: linkedClass?.title ?? null,
      hostSecret,
    });
  }

  const sessionId = generateJoinCode();
  const roomId = toRoomId(sessionId);
  timer.setContext({ roomId, sessionId });

  await timer.measure("liveblocks_room_create", async () => {
    liveblocksCallCount += 1;
    await liveblocks.createRoom(
      roomId,
      {
        defaultAccesses: [],
        metadata: hostRoomMetadata({
          creationId: parsed.creationId,
          teacherId: hostPlayerId,
          joinCode: sessionId,
          initStatus: "failed",
        }),
      },
      { idempotent: true },
    );
  });

  let bootstrap: HostBootstrapResult;
  try {
    bootstrap = await timer.measure("liveblocks_storage_init", () =>
      bootstrapLiveGameHostStorage({
        roomId,
        hostUserId: hostPlayerId,
        displayName: parsed.displayName,
        avatarId: parsed.avatarId,
        classId: linkedClass?.id ?? null,
        classTitle: linkedClass?.title ?? null,
        joinCode: sessionId,
        modeId: parsed.modeId,
        mapId: mode.defaultMapId,
        durationMinutes: normalizeEnglishCraftDurationMinutes(parsed.durationMinutes),
        questionSetId: questionSetBinding.setId,
        questionSetVersion: questionSetBinding.version,
      }),
    );
    liveblocksCallCount += bootstrap.liveblocksInitCount + bootstrap.liveblocksMutateCount;
  } catch (error) {
    try {
      liveblocksCallCount += 1;
      await liveblocks.deleteRoom(roomId);
      cleanupOutcome = "deleted_orphan_room";
    } catch {
      cleanupOutcome = "delete_failed";
    }
    applyBootstrapDiagnostics(timer, {
      roomId,
      sessionId,
      creationId: parsed.creationId,
      idempotencyOutcome: "bootstrap_failed",
      roomAlreadyExisted: false,
      cleanupOutcome,
      questionBundleBindingStrategy: "resolved_during_host_create",
      bootstrap: null,
      liveblocksCallCount,
      liveblocksReadCount,
    });
    console.error("Live-game host storage bootstrap failed", error);
    return NextResponse.json(
      { error: "Could not finish creating the room. Please try again." },
      { status: 503 },
    );
  }

  await timer.measure("liveblocks_room_update", async () => {
    liveblocksCallCount += 1;
    await markHostRoomInitStatus(roomId, "ready");
  });

  applyBootstrapDiagnostics(timer, {
    roomId,
    sessionId,
    creationId: parsed.creationId,
    idempotencyOutcome: "created",
    roomAlreadyExisted: false,
    cleanupOutcome: null,
    questionBundleBindingStrategy: "resolved_during_host_create",
    bootstrap,
    liveblocksCallCount,
    liveblocksReadCount,
  });

  return hostSuccessResponse({
    sessionId,
    roomId,
    userId: hostPlayerId,
    displayName: parsed.displayName,
    modeId: parsed.modeId,
    mapId: mode.defaultMapId,
    durationMinutes: parsed.durationMinutes,
    questionSetId: questionSetBinding.setId,
    questionSetVersion: questionSetBinding.version,
    classId: linkedClass?.id ?? null,
    classTitle: linkedClass?.title ?? null,
    hostSecret,
  });
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_host_create", (timer) => handlePost(request, timer));
}

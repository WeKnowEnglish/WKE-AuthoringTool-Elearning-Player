import { LiveObject } from "@liveblocks/client";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toLiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import type { LiveGameLobbyPlayer, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  createLiveGamePlayerToken,
  getLiveGamePlayerSession,
  LIVE_GAME_PLAYER_COOKIE_NAME,
  liveGamePlayerCookieOptions,
} from "@/lib/live-game/server/player-session";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { createMovementState } from "@/lib/live-game/engine/movement";
import { getMapForMode } from "@/lib/live-game/modes";
import { getLiveGameCapacity, LIVE_GAME_MAX_STUDENTS } from "@/lib/live-game/limits";
import { withLiveGameRoomLock } from "@/lib/live-game/server/room-lock";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";

async function handlePost(request: Request, timer: LiveGameServerTimer) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    displayName?: string;
    avatarId?: string;
  } | null;
  const sessionId = body?.sessionId?.trim().toUpperCase() ?? "";
  const displayName = body?.displayName?.trim().slice(0, 80) ?? "";
  if (!isValidJoinCode(sessionId) || !displayName) {
    return NextResponse.json({ error: "Valid sessionId and displayName are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await timer.measure("auth", () => supabase.auth.getUser());

  const roomId = toRoomId(sessionId);
  timer.setContext({ roomId, sessionId, role: "player", routeType: "join" });

  const existingIdentity = await getLiveGamePlayerSession();
  const playerId =
    user?.id ??
    (existingIdentity?.roomId === roomId && existingIdentity.role === "player" ?
      existingIdentity.playerId
    : `guest-${randomBytes(16).toString("hex")}`);
  const requestedAvatar = toLiveGameCharacterId(body?.avatarId ?? "");
  const reconnect =
    existingIdentity?.roomId === roomId &&
    existingIdentity.role === "player" &&
    existingIdentity.playerId === playerId;

  let liveblocksCallCount = 0;
  let liveblocksReadCount = 0;
  let liveblocksMutateCount = 0;
  let storageSnapshotReused = false;
  let playerCountBefore = 0;
  let playerCountAfter = 0;
  let joinOutcome = "pending";
  let idempotencyOutcome = "none";
  let mutationRequestBytes: number | null = null;

  const admission = await withLiveGameRoomLock(roomId, async () => {
    // Single full Storage read under the lock — concurrent instances still rely on
    // mutateStorage idempotent insertion (`if (!players.get(playerId))`).
    const current = await timer.measure("liveblocks_read", async () => {
      liveblocksCallCount += 1;
      liveblocksReadCount += 1;
      return readLiveGameStorageJson(roomId);
    });
    storageSnapshotReused = true;
    if (!current?.session) {
      return { ok: false as const, status: 404, code: "room_not_found", error: "Room not found." };
    }
    if (current.session.phase !== "lobby") {
      return {
        ok: false as const,
        status: 409,
        code: "game_started",
        error: "This game has already started.",
      };
    }

    playerCountBefore = Object.keys(current.players ?? {}).length;
    const capacity = getLiveGameCapacity(current.players, playerId);
    if (!capacity.canJoinAsStudent) {
      const invalidHostCount = capacity.hostCount !== 1;
      return {
        ok: false as const,
        status: 409,
        code: invalidHostCount ? "room_unavailable" : "room_full",
        error:
          invalidHostCount ? "This room is not available. Ask your teacher to create a new game."
          : `This game is full. The current limit is ${LIVE_GAME_MAX_STUDENTS} students.`,
      };
    }

    const alreadyPresent = Boolean(current.players?.[playerId]);
    const liveblocks = getLiveblocksServerClient();
    await timer.measure("liveblocks_mutate", async () => {
      liveblocksCallCount += 1;
      liveblocksMutateCount += 1;
      mutationRequestBytes = Buffer.byteLength(
        JSON.stringify({
          playerId,
          displayName,
          avatarId: requestedAvatar,
          insert: !alreadyPresent,
        }),
        "utf8",
      );
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const liveRoot = root as unknown as { get(key: string): unknown };
        const players = root.get("players") as unknown as {
          get(id: string): unknown;
          set(id: string, value: LiveObject<LiveGameLobbyPlayer>): void;
        };
        if (!players?.get(playerId)) {
          players.set(
            playerId,
            new LiveObject<LiveGameLobbyPlayer>({
              name: displayName,
              color: "#64748b",
              role: "player",
              isReady: false,
              joinedAt: Date.now(),
              avatarId: requestedAvatar,
            }),
          );
          const positions = liveRoot.get("playerPositions") as import("@liveblocks/client").LiveMap<
            string,
            LiveObject<{ x: number; y: number; updatedAt: number }>
          >;
          const spawn = createMovementState(
            getMapForMode(current.session.mapId, current.session.modeId),
            Object.keys(current.players ?? {}).length,
          );
          positions?.set(playerId, new LiveObject({ ...spawn, updatedAt: Date.now() }));
        }
      });
    });

    if (alreadyPresent) {
      joinOutcome = "existing_player";
      idempotencyOutcome = reconnect ? "reconnect" : "duplicate_request";
      playerCountAfter = playerCountBefore;
    } else {
      joinOutcome = "inserted";
      idempotencyOutcome = "inserted";
      playerCountAfter = playerCountBefore + 1;
    }

    return { ok: true as const, snapshot: current };
  });

  if (!admission.ok) {
    timer.setContext({
      liveblocksCallCount,
      liveblocksReadCount,
      liveblocksMutateCount,
      idempotencyOutcome: admission.code,
    });
    console.info(
      JSON.stringify({
        type: "live_game_student_join_detail",
        roomId,
        sessionId,
        liveblocksCallCount,
        liveblocksReadCount,
        liveblocksMutateCount,
        storageSnapshotReused,
        playerCountBefore,
        playerCountAfter,
        joinOutcome: admission.code,
        idempotencyOutcome: admission.code,
        reconnect,
        mutationRequestBytes,
      }),
    );
    return NextResponse.json(
      { error: admission.error, code: admission.code },
      { status: admission.status },
    );
  }
  const admittedSnapshot = admission.snapshot;

  const payload = {
    sessionId,
    userId: playerId,
    role: "player" as const,
    classId: admittedSnapshot.session.classId,
    classTitle: admittedSnapshot.session.classTitle,
    mapId: admittedSnapshot.session.mapId,
    modeId: admittedSnapshot.session.modeId,
    durationMinutes: admittedSnapshot.session.durationMinutes,
    questionSetId: admittedSnapshot.session.questionSetId,
    questionSetVersion: admittedSnapshot.session.questionSetVersion,
  } satisfies Partial<LiveGameStorageSnapshot["session"]> & {
    userId: string;
    role: "player";
    sessionId: string;
  };
  const responseBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  timer.setContext({
    liveblocksCallCount,
    liveblocksReadCount,
    liveblocksMutateCount,
    idempotencyOutcome,
    responseBytes,
  });
  console.info(
    JSON.stringify({
      type: "live_game_student_join_detail",
      roomId,
      sessionId,
      liveblocksCallCount,
      liveblocksReadCount,
      liveblocksMutateCount,
      storageSnapshotReused,
      playerCountBefore,
      playerCountAfter,
      joinOutcome,
      idempotencyOutcome,
      reconnect,
      mutationRequestBytes,
      responseBytes,
    }),
  );

  const response = NextResponse.json(payload);
  response.cookies.set(
    LIVE_GAME_PLAYER_COOKIE_NAME,
    createLiveGamePlayerToken({
      roomId,
      playerId,
      role: "player",
      displayName,
      accountType: user ? "authenticated" : "guest",
      accountUserId: user?.id ?? null,
    }),
    liveGamePlayerCookieOptions(),
  );
  return response;
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_student_join", (timer) => handlePost(request, timer));
}

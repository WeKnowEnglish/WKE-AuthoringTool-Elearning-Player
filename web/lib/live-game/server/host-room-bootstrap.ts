import "server-only";

import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { createLiveGameInitialStorage } from "@/lib/live-game/liveblocks/initial-storage";
import { getMapForMode } from "@/lib/live-game/modes";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";
import { createMovementState } from "@/lib/live-game/engine/movement";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import type { LiveGameLobbyPlayer } from "@/lib/live-game/liveblocks/config";

export type HostBootstrapInput = {
  roomId: string;
  hostUserId: string;
  displayName: string;
  avatarId: string;
  classId: string | null;
  classTitle: string | null;
  joinCode: string;
  modeId: LiveGameModeId;
  mapId: string;
  durationMinutes: EnglishCraftSessionDuration;
  questionSetId: string;
  questionSetVersion: number;
};

export type HostBootstrapResult = {
  initializationStrategy: "initialize_storage_document" | "mutate_storage_fallback";
  fallbackReason: string | null;
  initialStorageBytes: number;
  topLevelStorageFieldCount: number;
  topLevelStorageFieldBytes: Record<string, number>;
  serializationMs: number;
  createRoomRequestBytes: number | null;
  mutateRequestBytes: number | null;
  hostPlayerCountAfter: number;
  liveblocksMutateCount: number;
  liveblocksInitCount: number;
};

export type HostRoomMetadata = {
  creationId: string;
  teacherId: string;
  joinCode: string;
  initStatus: "ready" | "failed";
};

export const LIVE_GAME_HOST_META = {
  creationId: "creationId",
  teacherId: "teacherId",
  joinCode: "joinCode",
  initStatus: "initStatus",
} as const;

function estimateJsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function buildHostSeededStorageFields(input: HostBootstrapInput) {
  const initial = createLiveGameInitialStorage({
    hostUserId: input.hostUserId,
    classId: input.classId,
    classTitle: input.classTitle,
    joinCode: input.joinCode,
    modeId: input.modeId,
    mapId: input.mapId,
    durationMinutes: input.durationMinutes,
    questionSetId: input.questionSetId,
    questionSetVersion: input.questionSetVersion,
  });

  initial.players.set(
    input.hostUserId,
    new LiveObject<LiveGameLobbyPlayer>({
      name: input.displayName,
      color: "#64748b",
      role: "host",
      isReady: true,
      joinedAt: Date.now(),
      avatarId: input.avatarId,
    }),
  );

  const spawn = createMovementState(getMapForMode(input.mapId, input.modeId), 0);
  initial.playerPositions.set(
    input.hostUserId,
    new LiveObject({ ...spawn, updatedAt: Date.now() }),
  );

  return initial;
}

export function buildHostSeededInitialRoot(input: HostBootstrapInput) {
  return new LiveObject(buildHostSeededStorageFields(input));
}

export function measureInitialStoragePayload(root: ReturnType<typeof buildHostSeededInitialRoot>) {
  const serializationStarted = performance.now();
  const plain = toPlainLson(root) as PlainLsonObject;
  const serializationMs = Math.max(0, performance.now() - serializationStarted);
  const fieldBytes: Record<string, number> = {};
  const data = (plain as { data?: Record<string, unknown> }).data ?? {};
  for (const [key, value] of Object.entries(data)) {
    fieldBytes[key] = estimateJsonBytes(value);
  }
  return {
    plain,
    serializationMs,
    initialStorageBytes: estimateJsonBytes(plain),
    topLevelStorageFieldCount: Object.keys(data).length,
    topLevelStorageFieldBytes: fieldBytes,
  };
}

export async function bootstrapLiveGameHostStorage(
  input: HostBootstrapInput,
): Promise<HostBootstrapResult> {
  const liveblocks = getLiveblocksServerClient();
  const root = buildHostSeededInitialRoot(input);
  const measured = measureInitialStoragePayload(root);

  try {
    await liveblocks.initializeStorageDocument(input.roomId, measured.plain);
    return {
      initializationStrategy: "initialize_storage_document",
      fallbackReason: null,
      initialStorageBytes: measured.initialStorageBytes,
      topLevelStorageFieldCount: measured.topLevelStorageFieldCount,
      topLevelStorageFieldBytes: measured.topLevelStorageFieldBytes,
      serializationMs: Math.round(measured.serializationMs),
      createRoomRequestBytes: null,
      mutateRequestBytes: measured.initialStorageBytes,
      hostPlayerCountAfter: 1,
      liveblocksMutateCount: 0,
      liveblocksInitCount: 1,
    };
  } catch (error) {
    const fallbackReason =
      error instanceof Error ? error.message.slice(0, 180) : "initialize_storage_document_failed";
    console.warn(
      JSON.stringify({
        type: "live_game_host_storage_init_fallback",
        roomId: input.roomId,
        reason: fallbackReason,
      }),
    );

    await liveblocks.mutateStorage(input.roomId, ({ root: liveRoot }) => {
      const writable = liveRoot as unknown as {
        set(key: string, value: unknown): void;
      };
      const fields = buildHostSeededStorageFields(input);
      for (const [key, value] of Object.entries(fields)) {
        writable.set(key, value);
      }
    });

    return {
      initializationStrategy: "mutate_storage_fallback",
      fallbackReason,
      initialStorageBytes: measured.initialStorageBytes,
      topLevelStorageFieldCount: measured.topLevelStorageFieldCount,
      topLevelStorageFieldBytes: measured.topLevelStorageFieldBytes,
      serializationMs: Math.round(measured.serializationMs),
      createRoomRequestBytes: null,
      mutateRequestBytes: measured.initialStorageBytes,
      hostPlayerCountAfter: 1,
      liveblocksMutateCount: 1,
      liveblocksInitCount: 0,
    };
  }
}

export async function findHostRoomByCreationId(input: {
  teacherId: string;
  creationId: string;
}): Promise<{ roomId: string; joinCode: string; initStatus: string } | null> {
  const liveblocks = getLiveblocksServerClient();
  const page = await liveblocks.getRooms({
    limit: 5,
    query: {
      metadata: {
        [LIVE_GAME_HOST_META.creationId]: input.creationId,
        [LIVE_GAME_HOST_META.teacherId]: input.teacherId,
      },
    },
  });
  const room = page.data[0];
  if (!room) return null;
  const joinMeta = room.metadata?.[LIVE_GAME_HOST_META.joinCode];
  const statusMeta = room.metadata?.[LIVE_GAME_HOST_META.initStatus];
  const joinCode = typeof joinMeta === "string" ? joinMeta : Array.isArray(joinMeta) ? joinMeta[0] : "";
  const initStatus =
    typeof statusMeta === "string" ? statusMeta : Array.isArray(statusMeta) ? statusMeta[0] : "unknown";
  if (!joinCode) return null;
  return { roomId: room.id, joinCode, initStatus };
}

export async function markHostRoomInitStatus(
  roomId: string,
  initStatus: "ready" | "failed",
): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.updateRoom(roomId, {
    metadata: {
      [LIVE_GAME_HOST_META.initStatus]: initStatus,
    },
  });
}

export function isValidHostCreationId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Permissive client fallback UUID (non-crypto browsers) still accepted as opaque token. */
export function isAcceptableHostCreationId(value: unknown): value is string {
  if (isValidHostCreationId(value)) return true;
  return typeof value === "string" && value.length >= 16 && value.length <= 80;
}

export function hostRoomMetadata(input: HostRoomMetadata): Record<string, string> {
  return {
    [LIVE_GAME_HOST_META.creationId]: input.creationId,
    [LIVE_GAME_HOST_META.teacherId]: input.teacherId,
    [LIVE_GAME_HOST_META.joinCode]: input.joinCode,
    [LIVE_GAME_HOST_META.initStatus]: input.initStatus,
  };
}

import { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  LiveGameModeId,
  LiveGamePlayerCarry,
  LiveGameResourceNodeState,
  LiveGameSessionState,
} from "@/lib/live-game/liveblocks/config";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";
import { ENGLISH_CRAFT_RESOURCE_NODES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { EMPTY_LIVE_GAME_RESOURCE_POOL } from "@/lib/live-game/resource-pool";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";

function createInitialResourceNodes() {
  const nodes = new LiveMap<string, LiveObject<LiveGameResourceNodeState>>();
  for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
    nodes.set(
      node.id,
      new LiveObject<LiveGameResourceNodeState>({
        id: node.id,
        resourceType: node.resourceType,
        available: true,
        cooldownEndsAt: null,
        collectedCount: 0,
      }),
    );
  }
  return nodes;
}

export function createLiveGameInitialStorage(input: {
  hostUserId: string;
  joinCode: string;
  modeId: LiveGameModeId;
  mapId: string;
  durationMinutes: EnglishCraftSessionDuration;
  questionSetId: string;
  questionSetVersion: number;
}) {
  const session: LiveGameSessionState = {
    modeId: input.modeId,
    phase: "lobby",
    joinCode: input.joinCode,
    hostUserId: input.hostUserId,
    durationMinutes: input.durationMinutes,
    endsAt: null,
    mapId: input.mapId,
    createdAt: Date.now(),
    objectiveCompleted: false,
    victoryAt: null,
    completedByPlayerId: null,
    endedAt: null,
    endReason: null,
    lobbyNotice: null,
    questionSetId: input.questionSetId,
    questionSetVersion: input.questionSetVersion,
  };

  return {
    session: new LiveObject(session),
    players: new LiveMap<string, LiveObject<import("@/lib/live-game/liveblocks/config").LiveGameLobbyPlayer>>(),
    resourcePool: new LiveObject({ ...EMPTY_LIVE_GAME_RESOURCE_POOL }),
    resourceNodes: createInitialResourceNodes(),
    awardReceipts: new LiveMap(),
    craftedItems: new LiveObject({ ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS }),
    unlockedObjects: new LiveObject({ boat_boarding: false }),
    craftReceipts: new LiveMap(),
    playerPositions: new LiveMap(),
    playerCarry: new LiveMap<string, LiveObject<LiveGamePlayerCarry>>(),
    playerInventory: new LiveMap(),
    playerHunger: new LiveMap(),
    questionDeckCursors: new LiveMap<string, number>(),
  };
}

export function createEnglishCraftResourceNodes() {
  return createInitialResourceNodes();
}

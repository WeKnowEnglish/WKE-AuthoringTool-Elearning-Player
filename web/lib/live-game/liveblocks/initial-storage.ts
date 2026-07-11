import { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  LiveGameModeId,
  LiveGameResourceNodeState,
  LiveGameSessionState,
} from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";

function createInitialResourceNodes() {
  const nodes = new LiveMap<string, LiveObject<LiveGameResourceNodeState>>();
  for (const tree of ENGLISH_CRAFT_WOOD_TREES_V1) {
    nodes.set(
      tree.id,
      new LiveObject<LiveGameResourceNodeState>({
        id: tree.id,
        resourceType: "wood",
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
  durationMinutes: number;
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
  };

  return {
    session: new LiveObject(session),
    players: new LiveMap<string, LiveObject<import("@/lib/live-game/liveblocks/config").LiveGameLobbyPlayer>>(),
    resourcePool: new LiveObject({ wood: 0 }),
    resourceNodes: createInitialResourceNodes(),
  };
}

export function createEnglishCraftResourceNodes() {
  return createInitialResourceNodes();
}

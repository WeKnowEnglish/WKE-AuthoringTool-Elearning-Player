import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LobbyPhase, LobbyPlayer } from "@/liveblocks.config";

export function createLobbyInitialStorage(hostUserId: string, joinCode: string) {
  return {
    lobby: new LiveObject({
      phase: "waiting" as LobbyPhase,
      hostUserId,
      joinCode,
      createdAt: Date.now(),
    }),
    players: new LiveMap<string, LiveObject<LobbyPlayer>>(),
  };
}

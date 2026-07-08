import type { LiveObject, LiveMap } from "@liveblocks/client";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export type LobbyPhase = "waiting" | "starting" | "playing" | "finished";

export type LobbyPlayer = {
  name: string;
  color: string;
  role: "host" | "player";
  isReady: boolean;
  joinedAt: number;
};

declare global {
  interface Liveblocks {
    Presence: {
      displayName: string;
      role: "host" | "player";
    };
    Storage: {
      lobby: LiveObject<{
        phase: LobbyPhase;
        hostUserId: string;
        joinCode: string;
        createdAt: number;
      }>;
      players: LiveMap<string, LiveObject<LobbyPlayer>>;
      setup?: LiveObject<GameSetup>;
      runtime?: LiveObject<GameRuntime>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        role: "host" | "player";
      };
    };
  }
}

export {};

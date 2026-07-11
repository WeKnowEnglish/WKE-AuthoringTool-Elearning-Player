import type { LiveMap, LiveObject } from "@liveblocks/client";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";

export type LiveGamePhase = "lobby" | "playing" | "paused" | "completed";

export type LiveGameModeId = "english_craft";

export type LiveGameDirection = "up" | "down" | "left" | "right";

export type LiveGameAnimation = "idle" | "walk";

/** Presence fields for live-game rooms (assert when publishing). */
export type LiveGamePresence = {
  x: number;
  y: number;
  direction: LiveGameDirection;
  isMoving: boolean;
  animation: LiveGameAnimation;
  avatarId: string;
};

export type LiveGameLobbyPlayer = {
  name: string;
  color: string;
  role: "host" | "player";
  isReady: boolean;
  joinedAt: number;
  avatarId: string;
};

export type LiveGameSessionState = {
  modeId: LiveGameModeId;
  phase: LiveGamePhase;
  joinCode: string;
  hostUserId: string;
  durationMinutes: number;
  endsAt: number | null;
  mapId: string;
  createdAt: number;
};

export type LiveGameResourceType = "wood";

export type LiveGameResourcePool = {
  wood: number;
};

export type LiveGameResourceNodeState = {
  id: string;
  resourceType: LiveGameResourceType;
  available: boolean;
  cooldownEndsAt: number | null;
  collectedCount: number;
};

/** Storage root shape inside mutateStorage (Live structures). */
export type LiveGameStorageRoot = {
  session: LiveObject<LiveGameSessionState>;
  players: LiveMap<string, LiveObject<LiveGameLobbyPlayer>>;
  resourcePool: LiveObject<LiveGameResourcePool>;
  resourceNodes: LiveMap<string, LiveObject<LiveGameResourceNodeState>>;
};

/** Plain snapshot returned by useStorage selectors on the client. */
export type LiveGameStorageSnapshot = {
  session: LiveGameSessionState;
  players: Record<string, LiveGameLobbyPlayer>;
  resourcePool?: LiveGameResourcePool;
  resourceNodes?: Record<string, LiveGameResourceNodeState>;
};

export const DEFAULT_LIVE_GAME_PRESENCE: LiveGamePresence = {
  x: 0,
  y: 0,
  direction: "down",
  isMoving: false,
  animation: "idle",
  avatarId: LIVE_GAME_DEFAULT_AVATAR_ID,
};

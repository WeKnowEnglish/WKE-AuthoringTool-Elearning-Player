import type { LiveMap, LiveObject } from "@liveblocks/client";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";

export type LiveGamePhase = "lobby" | "playing" | "paused" | "completed" | "ended";

export type LiveGameEndReason = "host_closed";

export type LiveGameRoundEndReason = "timeout" | "host_ended_early";

export type LiveGameLobbyNotice = {
  reason: LiveGameRoundEndReason;
  at: number;
};

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
  durationMinutes: EnglishCraftSessionDuration;
  endsAt: number | null;
  mapId: string;
  createdAt: number;
  objectiveCompleted: boolean;
  victoryAt: number | null;
  completedByPlayerId: string | null;
  endedAt: number | null;
  endReason: LiveGameEndReason | null;
  lobbyNotice: LiveGameLobbyNotice | null;
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

export type LiveGameAwardReceipt = {
  wood: number;
  nodeCooldownEndsAt: number;
};

export type LiveGameCraftedItems = {
  bridge: boolean;
};

export type LiveGameUnlockedObjects = {
  river_crossing: boolean;
};

export type LiveGameCraftReceipt = {
  wood: number;
  bridgeCrafted: boolean;
};

/** Storage root shape inside mutateStorage (Live structures). */
export type LiveGameStorageRoot = {
  session: LiveObject<LiveGameSessionState>;
  players: LiveMap<string, LiveObject<LiveGameLobbyPlayer>>;
  resourcePool: LiveObject<LiveGameResourcePool>;
  resourceNodes: LiveMap<string, LiveObject<LiveGameResourceNodeState>>;
  awardReceipts: LiveMap<string, LiveObject<LiveGameAwardReceipt>>;
  craftedItems: LiveObject<LiveGameCraftedItems>;
  unlockedObjects: LiveObject<LiveGameUnlockedObjects>;
  craftReceipts: LiveMap<string, LiveObject<LiveGameCraftReceipt>>;
};

/** Plain snapshot returned by useStorage selectors on the client. */
export type LiveGameStorageSnapshot = {
  session: LiveGameSessionState;
  players: Record<string, LiveGameLobbyPlayer>;
  resourcePool?: LiveGameResourcePool;
  resourceNodes?: Record<string, LiveGameResourceNodeState>;
  awardReceipts?: Record<string, LiveGameAwardReceipt>;
  craftedItems?: LiveGameCraftedItems;
  unlockedObjects?: LiveGameUnlockedObjects;
  craftReceipts?: Record<string, LiveGameCraftReceipt>;
};

export const DEFAULT_LIVE_GAME_PRESENCE: LiveGamePresence = {
  x: 0,
  y: 0,
  direction: "down",
  isMoving: false,
  animation: "idle",
  avatarId: LIVE_GAME_DEFAULT_AVATAR_ID,
};

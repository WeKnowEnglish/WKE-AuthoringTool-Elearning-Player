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
  /** Held haul visual: resource type, bread, or empty hands. */
  carriedResourceType: LiveGameResourceType | "bread" | null;
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
  /** Existing teacher_classes ownership; null for one-off games. */
  classId: string | null;
  /** Snapshot retained if the class is later renamed or archived. */
  classTitle: string | null;
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
  /** Canonical question-set uuid; legacy sessions may still hold a slug. */
  questionSetId: string;
  questionSetVersion: number;
};

export type LiveGameResourceType = "wood" | "stone" | "wheat" | "cotton";

export type LiveGameResourcePool = {
  wood: number;
  stone: number;
  wheat: number;
  cotton: number;
};

export type LiveGameCarrySlot =
  | {
      kind: "resource";
      resourceType: LiveGameResourceType;
      sourceNodeId: string;
      questionId: string;
      harvestedAt: number;
    }
  | {
      kind: "bread";
      craftedAt: number;
    };

/** Multi-slot haul bag. Legacy single-item objects are normalized by carry-bag helpers. */
export type LiveGamePlayerCarry = {
  slots: Array<LiveGameCarrySlot | null>;
  heldSlotIndex: number;
};

export type LiveGameResourceNodeState = {
  id: string;
  resourceType: LiveGameResourceType;
  available: boolean;
  cooldownEndsAt: number | null;
  collectedCount: number;
};

export type LiveGameAwardReceipt = {
  awardKind: "carry" | "pool";
  resourceType: LiveGameResourceType;
  nodeCooldownEndsAt: number;
  /** Pool count after a deposit award. */
  poolCount?: number;
  /** How many matching items were deposited into the pool. */
  depositedAmount?: number;
  /** @deprecated Pre-3C harvest receipts used wood instead of awardKind. */
  wood?: number;
};

export type LiveGameCraftedItems = {
  benchBuilt: boolean;
  hammers: number;
  boat: boolean;
};

export type LiveGamePlayerInventory = {
  /** @deprecated Prefer carry-slot bread; kept for migration of older rooms. */
  bread: number;
  backpack: boolean;
};

export type LiveGamePlayerHunger = {
  value: number;
  lastUpdatedAt: number;
};

export type LiveGameUnlockedObjects = {
  boat_boarding: boolean;
};

export type LiveGameCraftReceipt = {
  recipeId?: string;
  wood: number;
  stone?: number;
  wheat?: number;
  cotton?: number;
  benchBuilt?: boolean;
  hammers?: number;
  boatCrafted?: boolean;
  breadGranted?: number;
  backpackGranted?: boolean;
};

export type LiveGamePlayerPosition = { x: number; y: number; updatedAt: number };

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
  playerPositions: LiveMap<string, LiveObject<LiveGamePlayerPosition>>;
  playerCarry: LiveMap<string, LiveObject<LiveGamePlayerCarry>>;
  playerInventory: LiveMap<string, LiveObject<LiveGamePlayerInventory>>;
  playerHunger: LiveMap<string, LiveObject<LiveGamePlayerHunger>>;
  questionDeckCursors: LiveMap<string, number>;
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
  playerPositions?: Record<string, LiveGamePlayerPosition>;
  playerCarry?: Record<string, LiveGamePlayerCarry>;
  playerInventory?: Record<string, LiveGamePlayerInventory>;
  playerHunger?: Record<string, LiveGamePlayerHunger>;
  questionDeckCursors?: Record<string, number>;
};

/** Minimal client/server fields used by craft recipe gate helpers. */
export type LiveGameCraftGateSnapshot = {
  session?: Pick<LiveGameSessionState, "phase">;
  resourcePool?: LiveGameResourcePool;
  craftedItems?: LiveGameCraftedItems;
  playerInventory?: Record<string, LiveGamePlayerInventory>;
  playerCarry?: Record<string, LiveGamePlayerCarry | Record<string, unknown>>;
};

export const DEFAULT_LIVE_GAME_PRESENCE: LiveGamePresence = {
  x: 0,
  y: 0,
  direction: "down",
  isMoving: false,
  animation: "idle",
  avatarId: LIVE_GAME_DEFAULT_AVATAR_ID,
  carriedResourceType: null,
};

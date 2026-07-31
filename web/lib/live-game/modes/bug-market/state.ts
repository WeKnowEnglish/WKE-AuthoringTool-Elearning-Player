import { LiveMap, LiveObject } from "@liveblocks/client";

export type BugMarketRarity = "common" | "uncommon" | "rare";
export type BugMarketBugState = "available" | "claimed" | "caught";

export type BugMarketInventoryItem = {
  id: string;
  speciesId: string;
  rarity: BugMarketRarity;
  caughtAt: number;
};

export type BugMarketPlayerState = {
  playerId: string;
  coins: number;
  netLevel: number;
  displayCaseLevel: number;
  inventory: BugMarketInventoryItem[];
  bugsCaught: number;
  bugsSold: number;
  lastSwingAt: number | null;
};

export type BugMarketWorldBug = {
  id: string;
  speciesId: string;
  rarity: BugMarketRarity;
  x: number;
  y: number;
  movementSeed: number;
  spawnedAt: number;
  expiresAt: number;
  state: BugMarketBugState;
  claimedBy: string | null;
  claimedAt: number | null;
};

export type BugMarketModeState = {
  modeId: "bug_market";
  schemaVersion: 1;
  roundNumber: number;
  meadowSeed: string;
  nextSpawnAt: number | null;
};

export type BugMarketCatchReceipt = {
  clientActionId: string;
  playerId: string;
  bugId: string;
  outcome: "caught" | "missed";
  inventoryItem: BugMarketInventoryItem | null;
  resolvedAt: number;
};

export type BugMarketSaleReceipt = {
  challengeId: string;
  playerId: string;
  inventoryItemId: string;
  speciesId: string;
  coinsAwarded: number;
  coinBalance: number;
  soldAt: number;
};

export type BugMarketPurchaseReceipt = {
  clientActionId: string;
  playerId: string;
  itemId: "net_level_2";
  coinsSpent: number;
  coinBalance: number;
  purchasedAt: number;
};

export const BUG_MARKET_STARTING_CAPACITY = 6;

export const BUG_MARKET_STARTER_BUGS: readonly BugMarketWorldBug[] = [
  {
    id: "starter-ant-1",
    speciesId: "ant",
    rarity: "common",
    x: 260,
    y: 250,
    movementSeed: 101,
    spawnedAt: 0,
    expiresAt: Number.MAX_SAFE_INTEGER,
    state: "available",
    claimedBy: null,
    claimedAt: null,
  },
  {
    id: "starter-ladybug-1",
    speciesId: "ladybug",
    rarity: "common",
    x: 610,
    y: 300,
    movementSeed: 202,
    spawnedAt: 0,
    expiresAt: Number.MAX_SAFE_INTEGER,
    state: "available",
    claimedBy: null,
    claimedAt: null,
  },
  {
    id: "starter-butterfly-1",
    speciesId: "butterfly",
    rarity: "uncommon",
    x: 930,
    y: 220,
    movementSeed: 303,
    spawnedAt: 0,
    expiresAt: Number.MAX_SAFE_INTEGER,
    state: "available",
    claimedBy: null,
    claimedAt: null,
  },
] as const;

export function createBugMarketPlayerState(playerId: string): BugMarketPlayerState {
  return {
    playerId,
    coins: 0,
    netLevel: 1,
    displayCaseLevel: 1,
    inventory: [],
    bugsCaught: 0,
    bugsSold: 0,
    lastSwingAt: null,
  };
}

export function createBugMarketInitialModeStorage(seed = "bug-market-round-v1") {
  const bugs = new LiveMap<string, LiveObject<BugMarketWorldBug>>();
  for (const bug of BUG_MARKET_STARTER_BUGS) {
    bugs.set(bug.id, new LiveObject({ ...bug }));
  }
  return {
    modeState: new LiveObject<BugMarketModeState>({
      modeId: "bug_market",
      schemaVersion: 1,
      roundNumber: 0,
      meadowSeed: seed,
      nextSpawnAt: null,
    }),
    bugMarketPlayers: new LiveMap<string, LiveObject<BugMarketPlayerState>>(),
    bugs,
    bugMarketCatchReceipts: new LiveMap<string, LiveObject<BugMarketCatchReceipt>>(),
    bugMarketSaleReceipts: new LiveMap<string, LiveObject<BugMarketSaleReceipt>>(),
    bugMarketPurchaseReceipts: new LiveMap<string, LiveObject<BugMarketPurchaseReceipt>>(),
  };
}

import type { FarmPlot, GardenSeed, GardenSnapshotV1 } from "@/lib/garden/types";

export const GARDEN_STORAGE_KEY = "wke-garden-v2";

/** Previous keys cleared on load so pre–Phase 2 saves are fully reset. */
export const LEGACY_GARDEN_STORAGE_KEYS = ["wke-garden-v1"] as const;

export const GARDEN_GRID_ROWS = 4;
export const GARDEN_GRID_COLS = 4;

/** Top row — always free dirt plots for planting. */
export const GARDEN_FREE_DIRT_ROW = 0;
export const GARDEN_GRASS_ROW_MIN = 1;
export const GARDEN_GRASS_PLOT_COUNT = 12;

/** First grass plot purchase cost; doubles for each additional grass plot. */
export const PLOT_PURCHASE_BASE_GOLD = 25;

/** Starter seeds so new players can plant right away. */
export const STARTER_SEED_COUNT = 1;

/** Growth speed multiplier applied by the watering can (2 = twice as fast). */
export const WATERING_CAN_GROW_MULTIPLIER = 2;

/** Cooldown between watering can uses (5 minutes). */
export const WATERING_CAN_COOLDOWN_MS = 5 * 60 * 1000;

/** Cooldown between fertilizer uses (15 minutes). */
export const FERTILIZER_COOLDOWN_MS = 15 * 60 * 1000;

/** Chance an eligible empty plot spawns a weed monster per reconcile pass. */
export const WEED_MONSTER_BASE_SPAWN_CHANCE = 0.08;

/** Spawn multiplier when the garden is mostly full (still non-zero). */
export const WEED_MONSTER_EMPTY_BOOST_MIN = 0.5;

/** Spawn multiplier when many plots are empty. */
export const WEED_MONSTER_EMPTY_BOOST_MAX = 2.0;

/** First N lifetime harvests never spawn weed monsters. */
export const WEED_MONSTER_GRACE_HARVESTS = 3;

/** Maximum weed monsters on the farm at once. */
export const WEED_MONSTER_MAX_ACTIVE = 3;

/** Letters per word in a weed monster battle puzzle. */
export const WEED_MONSTER_WORD_LENGTH = 3;

/** Battle timer — player must solve the puzzle within this window. */
export const WEED_BATTLE_TIME_MS = 30_000;

/** Cooldown after a failed battle before retry. */
export const WEED_BATTLE_FAIL_COOLDOWN_MS = 3_000;

/** Seeds granted on weed monster victory. */
export const WEED_BATTLE_SEED_REWARD = 3;

/** Random gold range on weed monster victory (inclusive). */
export const WEED_BATTLE_GOLD_MIN = 2;
export const WEED_BATTLE_GOLD_MAX = 8;

/** XP granted on weed monster victory. */
export const WEED_BATTLE_XP_REWARD = 5;

/** @deprecated Use WEED_MONSTER_BASE_SPAWN_CHANCE */
export const WEED_SPAWN_CHANCE = WEED_MONSTER_BASE_SPAWN_CHANCE;

/** @deprecated Use WEED_MONSTER_GRACE_HARVESTS */
export const WEED_GRACE_HARVESTS = WEED_MONSTER_GRACE_HARVESTS;

/** @deprecated Use WEED_MONSTER_MAX_ACTIVE */
export const WEED_MAX_ACTIVE = WEED_MONSTER_MAX_ACTIVE;

/** Letters required in the tray to mint one recycled common seed. */
export const LETTERS_PER_RECYCLED_SEED = 3;

export function newGardenId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `garden-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyPlots(rows: number, cols: number): FarmPlot[] {
  const plots: FarmPlot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      plots.push({
        row,
        col,
        seedId: null,
        seedTier: null,
        plantedAt: null,
        growMultiplier: 1,
      });
    }
  }
  return plots;
}

function starterSeeds(now: number): GardenSeed[] {
  return Array.from({ length: STARTER_SEED_COUNT }, (_, i) => ({
    id: newGardenId(),
    tier: "common" as const,
    grantedAt: now,
    sourceEventId: `starter:${i}`,
  }));
}

export function emptyGardenSnapshot(now = Date.now()): GardenSnapshotV1 {
  return {
    schemaVersion: 1,
    lastUpdatedAt: now,
    gridRows: GARDEN_GRID_ROWS,
    gridCols: GARDEN_GRID_COLS,
    plots: createEmptyPlots(GARDEN_GRID_ROWS, GARDEN_GRID_COLS),
    seedPouch: starterSeeds(now),
    letters: {},
    items: {},
    spelledWords: [],
    spellingLevel: 1,
    spelledAtLevel: [],
    purchasedPlotKeys: [],
  };
}

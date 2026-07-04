import type { FarmPlot, GardenSeed, GardenSnapshotV1 } from "@/lib/garden/types";

export const GARDEN_STORAGE_KEY = "wke-garden-v1";

export const GARDEN_GRID_ROWS = 4;
export const GARDEN_GRID_COLS = 4;

/** Starter seeds so new players can plant right away. */
export const STARTER_SEED_COUNT = 1;

/** Growth speed multiplier applied by the watering can (2 = twice as fast). */
export const WATERING_CAN_GROW_MULTIPLIER = 2;

/** Cooldown between watering can uses (5 minutes). */
export const WATERING_CAN_COOLDOWN_MS = 5 * 60 * 1000;

/** Cooldown between fertilizer uses (15 minutes). */
export const FERTILIZER_COOLDOWN_MS = 15 * 60 * 1000;

/** Chance a newly-ready crop spawns a weed (after grace period). */
export const WEED_SPAWN_CHANCE = 0.3;

/** First N lifetime harvests never spawn weeds. */
export const WEED_GRACE_HARVESTS = 3;

/** Maximum weeded plots at once. */
export const WEED_MAX_ACTIVE = 1;

export const WEED_MIN_WORD_LENGTH = 3;
export const WEED_MAX_WORD_LENGTH = 4;

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
  };
}

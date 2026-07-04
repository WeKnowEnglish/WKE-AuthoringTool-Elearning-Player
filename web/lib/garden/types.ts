import type { GardenSpellingLevelId } from "@/lib/garden/spelling-levels";

export type GardenSeedTier = "common" | "bonus";

export type GardenSeed = {
  id: string;
  tier: GardenSeedTier;
  grantedAt: number;
  sourceEventId: string;
};

export type CropGrowthStage = "empty" | "sprout" | "growing" | "ready";

export type FarmPlot = {
  row: number;
  col: number;
  seedId: string | null;
  seedTier: GardenSeedTier | null;
  plantedAt: number | null;
  /** Temporary grow speed multiplier (e.g. watering can). */
  growMultiplier: number;
  /** Set when fertilizer ripens this crop. */
  fertilizedAt?: number | null;
  /** Word the student must spell to clear a weed on this plot. */
  weedWord?: string | null;
  /** True once we've rolled for a weed this crop cycle (ready transition). */
  weedRollDone?: boolean;
};

export type LetterInventory = Record<string, number>;

export type GardenItemId = "watering_can" | "fertilizer";

export type GardenItemInventory = Partial<Record<GardenItemId, number>>;

export type GardenSnapshotV1 = {
  schemaVersion: 1;
  lastUpdatedAt: number;
  gridRows: number;
  gridCols: number;
  plots: FarmPlot[];
  seedPouch: GardenSeed[];
  letters: LetterInventory;
  items: GardenItemInventory;
  spelledWords: string[];
  /** Active spelling level (1–6). */
  spellingLevel: GardenSpellingLevelId;
  /** Words spelled in the current level's word bank. */
  spelledAtLevel: string[];
  /** Epoch ms when the watering can was last used. */
  lastWateringCanUsedAt?: number;
  /** Epoch ms when fertilizer was last used. */
  lastFertilizerUsedAt?: number;
  /** Lifetime harvest count (for weed onboarding grace). */
  totalHarvests?: number;
};

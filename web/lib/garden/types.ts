import type { GardenSpellingLevelId } from "@/lib/garden/spelling-levels";
import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";

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
  /** Weed monster occupying an empty plot until the player wins the battle. */
  weedMonster?: WeedMonsterPuzzle | null;
  /** Uppercase A–Z — rolled at plant, granted at harvest. */
  cropLetter?: string | null;
  /** Sprite slug for letter fruit art — stable for the crop's lifetime. */
  fruitSlug?: LetterFruitSlug | null;
};

/** Timed 3-word letter-sort battle on an empty plot. */
export type WeedMonsterPuzzle = {
  /** Stable id for reward dedupe. */
  puzzleId: string;
  /** Three distinct 3-letter words (uppercase). */
  words: [string, string, string];
  /** Nine letters shuffled for the tray. */
  letterTray: string[];
  /** After a failed attempt, ms epoch before the player can retry. */
  cooldownUntil?: number;
  /** Set when the player opens the battle (for server-side timeout check). */
  battleStartedAt?: number;
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
  /**
   * "row,col" keys for grass cells (row >= 1) the player has bought.
   * Row 0 dirt plots are always free — never listed here.
   */
  purchasedPlotKeys?: string[];
};

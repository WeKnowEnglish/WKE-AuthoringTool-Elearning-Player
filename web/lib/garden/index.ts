export {
  grantGardenSeed,
  harvestAt,
  plantSeedAt,
  plotAt,
  applyWateringCanAt,
  applyFertilizerAt,
  tryClearWeedAt,
  type HarvestResult,
  type PlantResult,
  type WaterResult,
  type FertilizeResult,
  type ClearWeedResult,
} from "@/lib/garden/actions";
export {
  GARDEN_GRID_COLS,
  GARDEN_GRID_ROWS,
  GARDEN_STORAGE_KEY,
  STARTER_SEED_COUNT,
  WATERING_CAN_GROW_MULTIPLIER,
  WATERING_CAN_COOLDOWN_MS,
  FERTILIZER_COOLDOWN_MS,
  WEED_SPAWN_CHANCE,
  WEED_GRACE_HARVESTS,
  WEED_MAX_ACTIVE,
  createEmptyPlots,
  emptyGardenSnapshot,
  newGardenId,
} from "@/lib/garden/defaults";
export {
  GROW_MS_BY_TIER,
  formatGrowRemaining,
  growDurationMs,
  remainingGrowMs,
  resolveGrowthStage,
} from "@/lib/garden/growth";
export { GARDEN_ITEM_EMOJI, GARDEN_ITEM_LABELS } from "@/lib/garden/rewards";
export {
  GARDEN_SPELLING_LEVELS,
  GARDEN_SPELLING_LEVEL_IDS,
  GARDEN_SPELLING_VOCAB,
  clampSpellingLevel,
  getGardenSpellingLevel,
  isGardenSpellingWord,
  isWordInSpellingLevel,
  missingAlphabetLetters,
  spellingLevelProgress,
  nextSpellingLevel,
} from "@/lib/garden/spelling-levels";
export type { GardenSpellingLevel, GardenSpellingLevelId } from "@/lib/garden/spelling-levels";
export { trySpellWord, isSpellableWordForLevel, getSpellingLevelLabel, type SpellResult } from "@/lib/garden/spell-actions";
export {
  buildLetterRack,
  canAffordWord,
  consumeLetters,
  isSpellableWord,
  letterCounts,
  letterInventoryKey,
  totalLetterCount,
} from "@/lib/garden/spelling";
export {
  buildHarvestWeights,
  rollWeightedHarvestLetter,
  HARVEST_NEED_MULTIPLIER,
  HARVEST_LEVEL_LETTER_WEIGHT,
  HARVEST_OFF_LEVEL_FLOOR,
} from "@/lib/garden/harvest-weights";
export { grantGardenSeedForQuiz } from "@/lib/garden/quiz-rewards";
export { getGardenAttentionHint } from "@/lib/garden/garden-status";
export type { GardenAttentionHint, GardenAttentionKind } from "@/lib/garden/garden-status";
export {
  canUseFertilizer,
  formatFertilizerCooldown,
  hasFertilizerUnlocked,
  fertilizerCooldownRemainingMs,
  isPlotTreated,
} from "@/lib/garden/fertilizer";
export {
  canUseWateringCan,
  formatWateringCanCooldown,
  hasWateringCanUnlocked,
  wateringCanCooldownRemainingMs,
} from "@/lib/garden/watering-can";
export { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
export {
  countActiveWeeds,
  pickWeedWord,
  plotHasWeed,
  reconcileWeeds,
} from "@/lib/garden/weeds";
export { useGardenGrowthTicker } from "@/lib/garden/use-garden-growth-ticker";
export type {
  CropGrowthStage,
  FarmPlot,
  GardenItemId,
  GardenItemInventory,
  GardenSeed,
  GardenSeedTier,
  GardenSnapshotV1,
  LetterInventory,
} from "@/lib/garden/types";

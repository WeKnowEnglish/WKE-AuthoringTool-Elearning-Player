export {
  grantGardenSeed,
  harvestAt,
  plantSeedAt,
  plotAt,
  applyWateringCanAt,
  applyFertilizerAt,
  abandonWeedMonsterBattle,
  failWeedMonsterBattle,
  startWeedMonsterBattle,
  tryClearWeedAt,
  tryDefeatWeedMonster,
  type AbandonWeedMonsterBattleResult,
  type DefeatWeedMonsterResult,
  type FailWeedMonsterBattleResult,
  type HarvestResult,
  type PlantResult,
  type StartWeedMonsterBattleResult,
  type WaterResult,
  type FertilizeResult,
  type ClearWeedResult,
} from "@/lib/garden/actions";
export {
  GARDEN_GRID_COLS,
  GARDEN_GRID_ROWS,
  GARDEN_GRASS_PLOT_COUNT,
  GARDEN_GRASS_ROW_MIN,
  GARDEN_FREE_DIRT_ROW,
  GARDEN_STORAGE_KEY,
  PLOT_PURCHASE_BASE_GOLD,
  STARTER_SEED_COUNT,
  LETTERS_PER_RECYCLED_SEED,
  WATERING_CAN_GROW_MULTIPLIER,
  WATERING_CAN_COOLDOWN_MS,
  FERTILIZER_COOLDOWN_MS,
  WEED_SPAWN_CHANCE,
  WEED_GRACE_HARVESTS,
  WEED_MAX_ACTIVE,
  WEED_MONSTER_BASE_SPAWN_CHANCE,
  WEED_MONSTER_EMPTY_BOOST_MIN,
  WEED_MONSTER_EMPTY_BOOST_MAX,
  WEED_MONSTER_GRACE_HARVESTS,
  WEED_MONSTER_MAX_ACTIVE,
  WEED_MONSTER_WORD_LENGTH,
  WEED_BATTLE_TIME_MS,
  WEED_BATTLE_FAIL_COOLDOWN_MS,
  WEED_BATTLE_SEED_REWARD,
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
export {
  assignCropIdentity,
  ensurePlotCropIdentity,
  fruitSlugForCropLetter,
  normalizeCropLetter,
  normalizeFruitSlug,
  rollCropLetter,
} from "@/lib/garden/crop-letter";
export {
  canAddCellToSelection,
  createLetterGridSession,
  earnSeedsEventId,
  EARN_SEEDS_GRID_SIZE,
  EARN_SEEDS_MIN_WORD_LENGTH,
  generateLetterGrid,
  isEarnSeedsGridWord,
  isEarnSeedsUnlocked,
  trySubmitEarnSeedsWord,
  wordFromCellIndices,
  type EarnSeedsSubmitResult,
  type LetterGridSession,
} from "@/lib/garden/earn-seeds-grid";
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
  allGrassPlotsPurchased,
  allGrassPlotKeys,
  canPurchasePlotAt,
  countPurchasedGrassPlots,
  formatPlotPurchaseCost,
  getPurchasedPlotKeys,
  grassPlotCostByIndex,
  isGrassCell,
  isFreeDirtRow,
  isGrassRow,
  isPlotUnlocked,
  listLockedGrassPlots,
  listUnlockedPlots,
  nextGrassPlotCost,
  normalizePurchasedPlotKeys,
  parsePlotKey,
  plotKey,
} from "@/lib/garden/plot-unlock";
export {
  purchaseGrassPlotAt,
  type PurchaseGrassPlotResult,
} from "@/lib/garden/plot-purchase";
export {
  recycleLetters,
  selectionToLetterList,
  subtractConsumedFromSelection,
  type RecycleLettersResult,
} from "@/lib/garden/recycle-letters";
export {
  GARDEN_GRID_BG,
  GARDEN_LABEL_OFFSET_Y_PX,
  GARDEN_MAP_LAYOUT,
  gardenGridStyle,
  gardenLockedGrassAriaLabel,
  gardenPlotAriaLabel,
  gardenPlotInteractionState,
  gardenPlotOverlayText,
  gardenPlotOverlayVariant,
  resolveGardenCellVisual,
  type GardenCellKind,
  type GardenCellVisual,
  type GardenPlotInteractionState,
  type GardenPlotOverlayVariant,
} from "@/lib/garden/garden-map-layout";
export {
  buildWeedMonsterPuzzle,
  countActiveWeedMonsters,
  countActiveWeeds,
  normalizeWeedMonsterPuzzle,
  pickWeedMonsterPuzzle,
  pickWeedMonsterWords,
  plotHasWeed,
  plotHasWeedMonster,
  reconcileWeedMonsters,
  reconcileWeeds,
  weedMonsterEmptyRatio,
  weedMonsterSpawnChance,
} from "@/lib/garden/weed-monsters";
export {
  applyWeedBattleFailure,
  formatWeedMonsterCooldown,
  isWeedBattleExpired,
  isWeedMonsterOnCooldown,
  letterMultiset,
  multisetsEqual,
  normalizeWordSlots,
  startWeedBattleOnPuzzle,
  validateWeedBattleSolution,
  weedBattleRemainingMs,
  weedMonsterCooldownRemainingMs,
  type WeedBattleFailReason,
  type WeedBattleWordSlots,
} from "@/lib/garden/weed-battle";
export {
  formatWeedBattleVictoryMessage,
  grantWeedMonsterVictoryRewards,
  hasWeedBattleSeedsInPouch,
  rollWeedBattleGold,
  weedBattleRewardEventId,
  weedBattleSeedEventId,
  type WeedBattleVictoryRewards,
} from "@/lib/garden/weed-battle-rewards";
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
  WeedMonsterPuzzle,
} from "@/lib/garden/types";

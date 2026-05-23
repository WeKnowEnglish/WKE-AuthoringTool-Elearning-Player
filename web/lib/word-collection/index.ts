export {
  WORD_COLLECTION_STORAGE_KEY,
  type CollectedWord,
  type WordCollectionSnapshotV1,
  type WordTierDef,
  type WordUpgradePreview,
  type WordDisplayInfo,
} from "./types";
export { WORD_TIER_DEFS, MAX_WORD_TIER, getWordTierDef, getNextWordTierDef } from "./tiers";
export {
  getVocabularyEntryById,
  lookupWordIdFromLemma,
  getWordDisplayInfo,
} from "./catalog";
export {
  getWordCollection,
  listCollectedWords,
  grantWordLoot,
  getUpgradePreview,
  upgradeWord,
  getTierDefForWord,
} from "./storage";

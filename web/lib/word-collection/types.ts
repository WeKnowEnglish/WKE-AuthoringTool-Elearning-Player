export const WORD_COLLECTION_STORAGE_KEY = "wke-word-collection-v1";

export type CollectedWord = {
  wordId: string;
  count: number;
  tier: number;
  firstCollectedAt: string;
  lastCollectedAt: string;
};

export type WordCollectionSnapshotV1 = {
  schemaVersion: 1;
  words: Record<string, CollectedWord>;
};

export type WordTierBonus = {
  /** Display-only until wired into economy. */
  goldBonusPercent?: number;
  description: string;
};

export type WordTierDef = {
  tier: number;
  minCount: number;
  goldCost: number;
  label: string;
  bonus: WordTierBonus;
  visualTier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
};

export type WordUpgradePreview = {
  canUpgrade: boolean;
  currentTier: number;
  nextTier: number | null;
  missingCount: number;
  goldCost: number;
  atMaxTier: boolean;
};

export type WordDisplayInfo = {
  wordId: string;
  lemma: string;
  displayLabel: string;
  pos?: string;
};

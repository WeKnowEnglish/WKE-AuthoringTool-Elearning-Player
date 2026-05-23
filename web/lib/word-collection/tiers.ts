import type { WordTierDef } from "./types";

/** Tier 1 is granted on first loot; upgrades move to higher tiers. */
export const WORD_TIER_DEFS: WordTierDef[] = [
  {
    tier: 1,
    minCount: 1,
    goldCost: 0,
    label: "Found",
    bonus: { description: "Word added to your collection." },
    visualTier: "bronze",
  },
  {
    tier: 2,
    minCount: 3,
    goldCost: 25,
    label: "Practiced",
    bonus: { goldBonusPercent: 2, description: "+2% gold from activities using this word (coming soon)." },
    visualTier: "silver",
  },
  {
    tier: 3,
    minCount: 6,
    goldCost: 50,
    label: "Skilled",
    bonus: { goldBonusPercent: 4, description: "+4% gold bonus (coming soon)." },
    visualTier: "gold",
  },
  {
    tier: 4,
    minCount: 12,
    goldCost: 100,
    label: "Expert",
    bonus: { goldBonusPercent: 6, description: "+6% gold bonus (coming soon)." },
    visualTier: "platinum",
  },
  {
    tier: 5,
    minCount: 20,
    goldCost: 200,
    label: "Master",
    bonus: { goldBonusPercent: 10, description: "+10% gold bonus (coming soon)." },
    visualTier: "diamond",
  },
];

export const MAX_WORD_TIER = WORD_TIER_DEFS[WORD_TIER_DEFS.length - 1]!.tier;

export function getWordTierDef(tier: number): WordTierDef | undefined {
  return WORD_TIER_DEFS.find((t) => t.tier === tier);
}

export function getNextWordTierDef(currentTier: number): WordTierDef | undefined {
  return WORD_TIER_DEFS.find((t) => t.tier === currentTier + 1);
}

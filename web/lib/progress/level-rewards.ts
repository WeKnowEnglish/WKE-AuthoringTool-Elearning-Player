/** Gold granted on every level-up (before milestone extras). */
export const LEVEL_BASE_GOLD = 8;

/** Extra gold on first reach of specific levels (added to {@link LEVEL_BASE_GOLD}). */
export const LEVEL_MILESTONE_GOLD: Partial<Record<number, number>> = {
  2: 25,
  3: 50,
  5: 100,
  8: 150,
  10: 200,
};

/** Extra skill points every N levels (in addition to base 1 per level). */
export const LEVEL_SKILL_POINT_BONUS_EVERY = 5;

export type LevelPayout = {
  level: number;
  skillPoints: number;
  bonusGold: number;
};

export function skillPointsForLevel(level: number): number {
  if (level < 2) return 0;
  let sp = 1;
  if (level % LEVEL_SKILL_POINT_BONUS_EVERY === 0) sp += 1;
  return sp;
}

export function bonusGoldForLevel(level: number): number {
  if (level < 2) return 0;
  const base = LEVEL_BASE_GOLD;
  const extra = LEVEL_MILESTONE_GOLD[level] ?? 0;
  return base + extra;
}

export function payoutForLevel(level: number): LevelPayout {
  return {
    level,
    skillPoints: skillPointsForLevel(level),
    bonusGold: bonusGoldForLevel(level),
  };
}

/**
 * Grants level-up loot once per level in `levels` not already in `alreadyClaimed`.
 * Returns per-level breakdown and totals for the ceremony UI.
 */
export function totalLevelUpPayoutForLevels(
  levels: number[],
  alreadyClaimed: number[],
): {
  gold: number;
  skillPoints: number;
  payouts: LevelPayout[];
  newlyClaimed: number[];
} {
  const claimed = new Set(alreadyClaimed);
  const payouts: LevelPayout[] = [];
  let gold = 0;
  let skillPoints = 0;
  const newlyClaimed: number[] = [];

  for (const level of levels) {
    if (level < 2 || claimed.has(level)) continue;
    const row = payoutForLevel(level);
    payouts.push(row);
    gold += row.bonusGold;
    skillPoints += row.skillPoints;
    newlyClaimed.push(level);
    claimed.add(level);
  }

  return { gold, skillPoints, payouts, newlyClaimed };
}

/** @deprecated Use {@link totalLevelUpPayoutForLevels}. */
export function milestoneGoldForLevel(level: number): number {
  return bonusGoldForLevel(level);
}

/** @deprecated Use {@link totalLevelUpPayoutForLevels}. */
export function totalMilestoneGoldForLevels(
  levels: number[],
  alreadyClaimed: number[],
): { gold: number; newlyClaimed: number[] } {
  const r = totalLevelUpPayoutForLevels(levels, alreadyClaimed);
  return { gold: r.gold, newlyClaimed: r.newlyClaimed };
}

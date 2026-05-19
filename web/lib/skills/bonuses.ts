import { getSkillRank } from "@/lib/skills/ranks";
import type { SkillRanks } from "@/lib/skills/types";

/** Max stacked +% per bonus line (all ranks). */
export const SKILL_PERCENT_CAP = 25;

export type RewardBonusSource = "quiz" | "lesson" | "vocab" | "daily_quest" | "passive";

function percentBonus(rank: number, percentPerRank: number): number {
  return Math.min(SKILL_PERCENT_CAP, rank * percentPerRank);
}

export function quizGoldMultiplier(ranks?: SkillRanks): number {
  const rank = getSkillRank("quiz_gold", ranks);
  const pct = percentBonus(rank, 1);
  return 1 + pct / 100;
}

export function applyQuizGoldBonus(baseGold: number, ranks?: SkillRanks): number {
  if (baseGold <= 0) return 0;
  return Math.floor(baseGold * quizGoldMultiplier(ranks));
}

/** Base gold per pet treasure claim; +3 per pet_treasure rank. */
export function petTreasureGoldAmount(ranks?: SkillRanks): number {
  const rank = getSkillRank("pet_treasure", ranks);
  if (rank < 1) return 0;
  return 8 + (rank - 1) * 3;
}

export function hasPetTreasureSkill(ranks?: SkillRanks): boolean {
  return getSkillRank("pet_treasure", ranks) >= 1;
}

import type { LevelPayout } from "./level-rewards";

export const LEVEL_UP_EVENT = "wke-level-up";

export type LevelUpEventDetail = {
  newLevel: number;
  levelsGained: number[];
  payouts: LevelPayout[];
  totalSkillPoints: number;
  totalBonusGold: number;
  unlockLabels: string[];
  /** @deprecated Use totalBonusGold */
  milestoneGold: number;
};

export function dispatchLevelUp(detail: LevelUpEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<LevelUpEventDetail>(LEVEL_UP_EVENT, { detail }));
}

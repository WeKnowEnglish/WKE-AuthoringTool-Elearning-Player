import { describe, expect, it } from "vitest";
import {
  LEVEL_BASE_GOLD,
  bonusGoldForLevel,
  payoutForLevel,
  skillPointsForLevel,
  totalLevelUpPayoutForLevels,
} from "./level-rewards";

describe("level-rewards", () => {
  it("every level from 2 upward grants base gold", () => {
    expect(bonusGoldForLevel(4)).toBe(LEVEL_BASE_GOLD);
    expect(bonusGoldForLevel(2)).toBe(LEVEL_BASE_GOLD + 25);
  });

  it("skill points: 1 per level, +1 on multiples of 5", () => {
    expect(skillPointsForLevel(2)).toBe(1);
    expect(skillPointsForLevel(5)).toBe(2);
    expect(skillPointsForLevel(10)).toBe(2);
  });

  it("payoutForLevel matches components", () => {
    expect(payoutForLevel(5)).toEqual({
      level: 5,
      skillPoints: 2,
      bonusGold: LEVEL_BASE_GOLD + 100,
    });
  });

  it("totalLevelUpPayoutForLevels is idempotent per level", () => {
    const first = totalLevelUpPayoutForLevels([2, 3], []);
    expect(first.gold).toBe(bonusGoldForLevel(2) + bonusGoldForLevel(3));
    expect(first.skillPoints).toBe(2);
    expect(first.newlyClaimed).toEqual([2, 3]);

    const again = totalLevelUpPayoutForLevels([2, 3], first.newlyClaimed);
    expect(again.gold).toBe(0);
    expect(again.skillPoints).toBe(0);
    expect(again.payouts).toHaveLength(0);
  });
});

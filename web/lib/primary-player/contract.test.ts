import { describe, expect, it } from "vitest";
import { normalizePrimaryPlayerProfile, normalizePrimaryRewardReceipt } from "./contract";

describe("Primary player RPC contract", () => {
  it("unwraps the one-time import and skill purchase profile envelope", () => {
    expect(normalizePrimaryPlayerProfile({ profile: {
      studentId: "student-1", totalXp: 75, level: 2, goldBalance: 14,
      unspentSkillPoints: 1, skillRanks: { activity_xp: 2, activity_gold: 1 },
      economyVersion: 2, importedLocalRewardsAt: "2026-08-14T00:00:00Z",
    }})).toMatchObject({ studentId: "student-1", totalXp: 75, level: 2, goldBalance: 14 });
  });

  it("maps the persisted SQL receipt fields used by animation and level-up", () => {
    const receipt = normalizePrimaryRewardReceipt({
      eventId: "primary:test", rewardKind: "standard_activity", duplicate: false,
      baseXp: 20, baseGold: 5, xpBonus: 2, goldBonus: 1,
      xpDelta: 22, activityGoldDelta: 6, levelGoldDelta: 20,
      skillPointsDelta: 1, levelBefore: 1, levelAfter: 2, levelsGained: [2],
      profile: { studentId: "student-1", totalXp: 50, level: 2, goldBalance: 26,
        unspentSkillPoints: 1, skillRanks: { activity_xp: 2, activity_gold: 2 }, economyVersion: 2 },
    });
    expect(receipt).toMatchObject({ awardedXp: 22, awardedGold: 6, bonusXp: 2, bonusGold: 1, levelGold: 20, levelSkillPoints: 1, levelsGained: [2] });
  });

  it("maps duplicate receipts without replaying missing deltas", () => {
    const receipt = normalizePrimaryRewardReceipt({ duplicate: true, eventId: "primary:homework:1", rewardKind: "homework_completion", profile: {} });
    expect(receipt).toMatchObject({ duplicate: true, awardedXp: 0, awardedGold: 0, levelsGained: [] });
  });
});

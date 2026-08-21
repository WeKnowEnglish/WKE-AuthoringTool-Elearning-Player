import type { PrimaryPlayerProfile, PrimaryRewardKind, PrimaryRewardReceipt } from "./types";

type JsonRecord = Record<string, any>;

export function normalizePrimaryPlayerProfile(value: unknown): PrimaryPlayerProfile {
  const envelope = (value && typeof value === "object" ? value : {}) as JsonRecord;
  const raw = (envelope.profile && typeof envelope.profile === "object" ? envelope.profile : envelope) as JsonRecord;
  return {
    studentId: String(raw.studentId ?? raw.student_id ?? ""),
    totalXp: Number(raw.totalXp ?? raw.total_xp ?? 0),
    level: Number(raw.level ?? 1),
    goldBalance: Number(raw.goldBalance ?? raw.gold_balance ?? 0),
    unspentSkillPoints: Number(raw.unspentSkillPoints ?? raw.unspent_skill_points ?? 0),
    skillRanks: {
      activity_xp: Number(raw.skillRanks?.activity_xp ?? raw.skill_ranks?.activity_xp ?? 0),
      activity_gold: Number(raw.skillRanks?.activity_gold ?? raw.skill_ranks?.activity_gold ?? 0),
    },
    economyVersion: Number(raw.economyVersion ?? raw.economy_version ?? 2),
    importedLocalRewardsAt: raw.importedLocalRewardsAt ?? raw.imported_local_rewards_at ?? null,
  };
}

export function normalizePrimaryRewardReceipt(value: unknown): PrimaryRewardReceipt {
  const raw = (value && typeof value === "object" ? value : {}) as JsonRecord;
  return {
    eventId: String(raw.eventId ?? raw.event_id ?? ""),
    duplicate: Boolean(raw.duplicate),
    rewardKind: (raw.rewardKind ?? raw.reward_kind) as PrimaryRewardKind,
    baseXp: Number(raw.baseXp ?? raw.base_xp ?? 0),
    baseGold: Number(raw.baseGold ?? raw.base_gold ?? 0),
    bonusXp: Number(raw.bonusXp ?? raw.xpBonus ?? raw.bonus_xp ?? 0),
    bonusGold: Number(raw.bonusGold ?? raw.goldBonus ?? raw.bonus_gold ?? 0),
    awardedXp: Number(raw.awardedXp ?? raw.xpDelta ?? raw.awarded_xp ?? 0),
    awardedGold: Number(raw.awardedGold ?? raw.activityGoldDelta ?? raw.awarded_gold ?? 0),
    levelBefore: Number(raw.levelBefore ?? raw.level_before ?? 1),
    levelAfter: Number(raw.levelAfter ?? raw.level_after ?? 1),
    levelsGained: Array.isArray(raw.levelsGained ?? raw.levels_gained) ? (raw.levelsGained ?? raw.levels_gained).map(Number) : [],
    levelGold: Number(raw.levelGold ?? raw.levelGoldDelta ?? raw.level_gold ?? 0),
    levelSkillPoints: Number(raw.levelSkillPoints ?? raw.skillPointsDelta ?? raw.level_skill_points ?? 0),
    profile: normalizePrimaryPlayerProfile(raw.profile),
  };
}

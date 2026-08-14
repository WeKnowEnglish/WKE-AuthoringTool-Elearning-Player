"use client";

import { createClient } from "@/lib/supabase/client";
import { getRewards, replaceRewardsFromPrimaryProfile } from "@/lib/progress/rewards";
import { dispatchLevelUp } from "@/lib/progress/level-up-events";
import type { PrimaryPlayerProfile, PrimaryRewardKind, PrimaryRewardReceipt, PrimarySkillId } from "./types";

export const PRIMARY_REWARD_RECEIPT_EVENT = "wke-primary-reward-receipt";
export const PRIMARY_PLAYER_UPDATED_EVENT = "wke-primary-player-updated";

function profile(raw: any): PrimaryPlayerProfile {
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

function acceptProfile(value: PrimaryPlayerProfile) {
  replaceRewardsFromPrimaryProfile(value);
  window.dispatchEvent(new CustomEvent(PRIMARY_PLAYER_UPDATED_EVENT, { detail: value }));
}

export function acceptPrimaryRewardReceipt(raw: any): PrimaryRewardReceipt {
  const receipt: PrimaryRewardReceipt = {
    eventId: String(raw.eventId ?? raw.event_id), duplicate: Boolean(raw.duplicate),
    rewardKind: (raw.rewardKind ?? raw.reward_kind) as PrimaryRewardKind,
    baseXp: Number(raw.baseXp ?? raw.base_xp ?? 0), baseGold: Number(raw.baseGold ?? raw.base_gold ?? 0),
    bonusXp: Number(raw.bonusXp ?? raw.xpBonus ?? raw.bonus_xp ?? 0), bonusGold: Number(raw.bonusGold ?? raw.goldBonus ?? raw.bonus_gold ?? 0),
    awardedXp: Number(raw.awardedXp ?? raw.xpDelta ?? raw.awarded_xp ?? 0), awardedGold: Number(raw.awardedGold ?? raw.activityGoldDelta ?? raw.awarded_gold ?? 0),
    levelBefore: Number(raw.levelBefore ?? raw.level_before ?? 1), levelAfter: Number(raw.levelAfter ?? raw.level_after ?? 1),
    levelsGained: raw.levelsGained ?? raw.levels_gained ?? [], levelGold: Number(raw.levelGold ?? raw.levelGoldDelta ?? raw.level_gold ?? 0),
    levelSkillPoints: Number(raw.levelSkillPoints ?? raw.skillPointsDelta ?? raw.level_skill_points ?? 0), profile: profile(raw.profile),
  };
  acceptProfile(receipt.profile);
  if (!receipt.duplicate) {
    window.dispatchEvent(new CustomEvent(PRIMARY_REWARD_RECEIPT_EVENT, { detail: receipt }));
    if (receipt.levelsGained.length) dispatchLevelUp({
      newLevel: receipt.levelAfter, levelsGained: receipt.levelsGained,
      payouts: receipt.levelsGained.map((level) => ({ level, skillPoints: 1, bonusGold: 20 })),
      totalSkillPoints: receipt.levelSkillPoints, totalBonusGold: receipt.levelGold,
      unlockLabels: [], milestoneGold: receipt.levelGold,
    });
  }
  return receipt;
}

export async function syncPrimaryPlayer(): Promise<PrimaryPlayerProfile> {
  const local = getRewards();
  const { data, error } = await createClient().rpc("import_primary_local_rewards", {
    p_total_xp: Math.floor(local.experience),
    p_gold_balance: Math.floor(local.gold),
    p_unspent_skill_points: Math.floor(local.skillPoints ?? 0),
    p_skill_ranks: local.skillRanks ?? {},
  });
  if (error) throw error;
  const next = profile((data as any)?.profile ?? data);
  acceptProfile(next);
  return next;
}

export async function awardPrimaryReward(input: {
  eventId: string;
  rewardKind: PrimaryRewardKind;
  activityId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<PrimaryRewardReceipt> {
  const { data, error } = await createClient().rpc("apply_primary_reward", {
    p_event_id: input.eventId,
    p_reward_kind: input.rewardKind,
    p_activity_id: input.activityId ?? null,
    p_source: input.source ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) throw error;
  return acceptPrimaryRewardReceipt(data as any);
}

export async function purchasePrimarySkill(skillId: PrimarySkillId): Promise<PrimaryPlayerProfile> {
  const { data, error } = await createClient().rpc("purchase_primary_skill", { p_skill_id: skillId });
  if (error) throw error;
  const next = profile((data as any)?.profile ?? data);
  acceptProfile(next);
  return next;
}

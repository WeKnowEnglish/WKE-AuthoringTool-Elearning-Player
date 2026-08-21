"use client";

import { createClient } from "@/lib/supabase/client";
import { getRewards, replaceRewardsFromPrimaryProfile } from "@/lib/progress/rewards";
import { dispatchLevelUp } from "@/lib/progress/level-up-events";
import type { PrimaryPlayerProfile, PrimaryRewardKind, PrimaryRewardReceipt, PrimarySkillId } from "./types";
import { normalizePrimaryPlayerProfile, normalizePrimaryRewardReceipt } from "./contract";

export const PRIMARY_REWARD_RECEIPT_EVENT = "wke-primary-reward-receipt";
export const PRIMARY_PLAYER_UPDATED_EVENT = "wke-primary-player-updated";

function acceptProfile(value: PrimaryPlayerProfile) {
  replaceRewardsFromPrimaryProfile(value);
  window.dispatchEvent(new CustomEvent(PRIMARY_PLAYER_UPDATED_EVENT, { detail: value }));
}

export function acceptPrimaryRewardReceipt(raw: any): PrimaryRewardReceipt {
  const receipt = normalizePrimaryRewardReceipt(raw);
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
  const next = normalizePrimaryPlayerProfile(data);
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
  const next = normalizePrimaryPlayerProfile(data);
  acceptProfile(next);
  return next;
}

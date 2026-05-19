import { petTreasureGoldAmount, hasPetTreasureSkill } from "@/lib/skills/bonuses";
import { getSkillRanks } from "@/lib/skills/ranks";
import { PET_METER_IDS } from "@/lib/pet/types";
import type { PetSnapshotV1 } from "@/lib/pet/types";
import { getPetSnapshot, setPetSnapshot } from "@/lib/pet/storage";
import { getRewards, setRewardsFields } from "@/lib/progress/rewards";

/** All pet meters must be at or above this to claim treasure. */
export const PET_WELL_CARED_THRESHOLD = 75;

/** Minimum time between pet gold claims (8 hours). */
export const PET_GOLD_CLAIM_COOLDOWN_MS = 8 * 60 * 60 * 1000;

export function isPetWellCared(snapshot: PetSnapshotV1): boolean {
  return PET_METER_IDS.every((id) => snapshot.meters[id] >= PET_WELL_CARED_THRESHOLD);
}

export type PetClaimGoldResult =
  | { ok: true; gold: number }
  | { ok: false; reason: "no_skill" | "not_well_cared" | "on_cooldown" };

export function petGoldClaimCooldownRemainingMs(
  lastClaimAt: number | undefined,
  now = Date.now(),
): number {
  if (!lastClaimAt) return 0;
  const elapsed = now - lastClaimAt;
  return Math.max(0, PET_GOLD_CLAIM_COOLDOWN_MS - elapsed);
}

export function canClaimPetGold(now = Date.now()): PetClaimGoldResult {
  const ranks = getSkillRanks();
  if (!hasPetTreasureSkill(ranks)) {
    return { ok: false, reason: "no_skill" };
  }
  const pet = getPetSnapshot();
  if (!isPetWellCared(pet)) {
    return { ok: false, reason: "not_well_cared" };
  }
  if (petGoldClaimCooldownRemainingMs(pet.lastPetGoldClaimAt, now) > 0) {
    return { ok: false, reason: "on_cooldown" };
  }
  return { ok: true, gold: petTreasureGoldAmount(ranks) };
}

export function claimPetGold(now = Date.now()): PetClaimGoldResult {
  const check = canClaimPetGold(now);
  if (!check.ok) return check;

  const pet = getPetSnapshot();
  setPetSnapshot({ ...pet, lastPetGoldClaimAt: now });

  const rewards = getRewards();
  setRewardsFields({
    gold: rewards.gold + check.gold,
  });

  return { ok: true, gold: check.gold };
}

export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

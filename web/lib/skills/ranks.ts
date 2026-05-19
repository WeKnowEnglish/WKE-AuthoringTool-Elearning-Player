import { getSkillDef, SKILL_REGISTRY } from "@/lib/skills/registry";
import type { SkillId, SkillRanks } from "@/lib/skills/types";
import { getRewards, setRewardsFields, type RewardsSnapshot } from "@/lib/progress/rewards";

export function sanitizeSkillRanks(raw: unknown): SkillRanks {
  if (!raw || typeof raw !== "object") return {};
  const out: SkillRanks = {};
  for (const def of SKILL_REGISTRY) {
    const v = (raw as SkillRanks)[def.id];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[def.id] = Math.min(def.maxRank, Math.max(0, Math.floor(v)));
    }
  }
  return out;
}

export function getSkillRanks(snapshot?: RewardsSnapshot): SkillRanks {
  return sanitizeSkillRanks(snapshot?.skillRanks ?? getRewards().skillRanks);
}

export function getSkillRank(id: SkillId, ranks?: SkillRanks): number {
  const r = ranks ?? getSkillRanks();
  return r[id] ?? 0;
}

export function meetsSkillRequirements(
  def: { requires?: { skillId: SkillId; minRank: number }[] },
  ranks: SkillRanks,
): boolean {
  if (!def.requires?.length) return true;
  return def.requires.every((req) => (ranks[req.skillId] ?? 0) >= req.minRank);
}

export type SkillPurchaseBlockReason =
  | "not_implemented"
  | "max_rank"
  | "need_skill_points"
  | "level_too_low"
  | "requirements";

export type SkillPurchasePreview = {
  canBuy: boolean;
  reason: SkillPurchaseBlockReason | null;
  nextRank: number;
  cost: number;
};

export function previewSkillPurchase(
  skillId: SkillId,
  playerLevel: number,
  skillPoints: number,
  ranks?: SkillRanks,
): SkillPurchasePreview {
  const def = getSkillDef(skillId);
  const currentRanks = ranks ?? getSkillRanks();
  if (!def) {
    return { canBuy: false, reason: "not_implemented", nextRank: 0, cost: 0 };
  }
  const current = currentRanks[skillId] ?? 0;
  const nextRank = current + 1;
  if (!def.implemented) {
    return { canBuy: false, reason: "not_implemented", nextRank, cost: def.costPerRank };
  }
  if (current >= def.maxRank) {
    return { canBuy: false, reason: "max_rank", nextRank, cost: 0 };
  }
  if (def.minPlayerLevel && playerLevel < def.minPlayerLevel) {
    return { canBuy: false, reason: "level_too_low", nextRank, cost: def.costPerRank };
  }
  if (!meetsSkillRequirements(def, currentRanks)) {
    return { canBuy: false, reason: "requirements", nextRank, cost: def.costPerRank };
  }
  if (skillPoints < def.costPerRank) {
    return { canBuy: false, reason: "need_skill_points", nextRank, cost: def.costPerRank };
  }
  return { canBuy: true, reason: null, nextRank, cost: def.costPerRank };
}

export type PurchaseSkillResult =
  | { ok: true; ranks: SkillRanks; skillPoints: number }
  | { ok: false; reason: SkillPurchaseBlockReason };

export function purchaseSkillRank(
  skillId: SkillId,
  playerLevel: number,
): PurchaseSkillResult {
  const rewards = getRewards();
  const preview = previewSkillPurchase(
    skillId,
    playerLevel,
    rewards.skillPoints ?? 0,
    getSkillRanks(rewards),
  );
  if (!preview.canBuy || preview.reason) {
    return { ok: false, reason: preview.reason ?? "not_implemented" };
  }
  const def = getSkillDef(skillId)!;
  const ranks = { ...getSkillRanks(rewards), [skillId]: preview.nextRank };
  const skillPoints = (rewards.skillPoints ?? 0) - def.costPerRank;
  setRewardsFields({ skillRanks: ranks, skillPoints });
  return { ok: true, ranks, skillPoints };
}

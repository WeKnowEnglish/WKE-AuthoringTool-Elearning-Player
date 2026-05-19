export {
  applyQuizGoldBonus,
  hasPetTreasureSkill,
  petTreasureGoldAmount,
  quizGoldMultiplier,
  SKILL_PERCENT_CAP,
} from "@/lib/skills/bonuses";
export type { RewardBonusSource } from "@/lib/skills/bonuses";
export {
  canClaimPetGold,
  claimPetGold,
  formatCooldownRemaining,
  isPetWellCared,
  PET_GOLD_CLAIM_COOLDOWN_MS,
  PET_WELL_CARED_THRESHOLD,
  petGoldClaimCooldownRemainingMs,
} from "@/lib/skills/pet-claim";
export type { PetClaimGoldResult } from "@/lib/skills/pet-claim";
export {
  getSkillDef,
  SKILL_BRANCH_LABELS,
  SKILL_REGISTRY,
  skillsByBranch,
} from "@/lib/skills/registry";
export type { SkillDef } from "@/lib/skills/registry";
export {
  getSkillRank,
  getSkillRanks,
  meetsSkillRequirements,
  previewSkillPurchase,
  purchaseSkillRank,
  sanitizeSkillRanks,
} from "@/lib/skills/ranks";
export type {
  PurchaseSkillResult,
  SkillPurchaseBlockReason,
  SkillPurchasePreview,
} from "@/lib/skills/ranks";
export type { SkillBranch, SkillId, SkillRanks } from "@/lib/skills/types";
export { SKILL_BRANCHES, SKILL_IDS } from "@/lib/skills/types";

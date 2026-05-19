export const SKILL_BRANCHES = ["earn", "pet", "unlocks"] as const;

export type SkillBranch = (typeof SKILL_BRANCHES)[number];

export const SKILL_IDS = [
  "quiz_gold",
  "activity_gold",
  "activity_xp",
  "pet_treasure",
  "pet_decay_slow",
  "secret_garden",
  "second_pet",
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export type SkillRanks = Partial<Record<SkillId, number>>;

export type SkillRequirement = {
  skillId: SkillId;
  minRank: number;
};

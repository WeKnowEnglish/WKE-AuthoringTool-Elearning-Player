import type { SkillBranch, SkillId, SkillRequirement } from "@/lib/skills/types";

export type SkillDef = {
  id: SkillId;
  branch: SkillBranch;
  label: string;
  description: string;
  emoji: string;
  maxRank: number;
  costPerRank: number;
  /** When false, shown as “Coming soon” — cannot purchase. */
  implemented: boolean;
  minPlayerLevel?: number;
  requires?: SkillRequirement[];
};

export const SKILL_BRANCH_LABELS: Record<SkillBranch, string> = {
  earn: "Earn",
  pet: "Pet",
  unlocks: "Unlocks",
};

export const SKILL_REGISTRY: SkillDef[] = [
  {
    id: "quiz_gold",
    branch: "earn",
    label: "Quiz gold",
    description: "+1% gold from quiz activities per rank.",
    emoji: "🪙",
    maxRank: 5,
    costPerRank: 1,
    implemented: true,
  },
  {
    id: "activity_gold",
    branch: "earn",
    label: "Lesson gold",
    description: "+1% gold from lessons and vocab sets.",
    emoji: "✨",
    maxRank: 5,
    costPerRank: 1,
    implemented: false,
  },
  {
    id: "activity_xp",
    branch: "earn",
    label: "Activity XP",
    description: "+1% experience from activities.",
    emoji: "⭐",
    maxRank: 5,
    costPerRank: 1,
    implemented: false,
  },
  {
    id: "pet_treasure",
    branch: "pet",
    label: "Pet treasure",
    description: "Claim bonus gold when your pet is happy (all meters 75%+).",
    emoji: "💰",
    maxRank: 5,
    costPerRank: 1,
    implemented: true,
  },
  {
    id: "pet_decay_slow",
    branch: "pet",
    label: "Slow hunger",
    description: "Pet meters drop more slowly over time.",
    emoji: "🫧",
    maxRank: 3,
    costPerRank: 2,
    implemented: false,
  },
  {
    id: "secret_garden",
    branch: "unlocks",
    label: "Secret garden",
    description: "Opens a special area on the hub.",
    emoji: "🌳",
    maxRank: 1,
    costPerRank: 5,
    implemented: false,
    minPlayerLevel: 5,
  },
  {
    id: "second_pet",
    branch: "unlocks",
    label: "Second buddy",
    description: "Raise two pets at once.",
    emoji: "🐾",
    maxRank: 1,
    costPerRank: 8,
    implemented: false,
    minPlayerLevel: 10,
    requires: [{ skillId: "pet_treasure", minRank: 3 }],
  },
];

const SKILL_BY_ID = new Map(SKILL_REGISTRY.map((s) => [s.id, s]));

export function getSkillDef(id: SkillId): SkillDef | undefined {
  return SKILL_BY_ID.get(id);
}

export function skillsByBranch(branch: SkillBranch): SkillDef[] {
  return SKILL_REGISTRY.filter((s) => s.branch === branch);
}

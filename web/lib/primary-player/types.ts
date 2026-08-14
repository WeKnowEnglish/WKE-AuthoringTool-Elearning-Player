export type PrimarySkillId = "activity_xp" | "activity_gold";

export type PrimaryPlayerProfile = {
  studentId: string;
  totalXp: number;
  level: number;
  goldBalance: number;
  unspentSkillPoints: number;
  skillRanks: Record<PrimarySkillId, number>;
  economyVersion: number;
  importedLocalRewardsAt: string | null;
};

export type PrimaryRewardKind =
  | "micro_activity"
  | "standard_activity"
  | "substantial_lesson"
  | "homework_completion"
  | "review_completion"
  | "daily_goal"
  | "game_learning";

export type PrimaryRewardReceipt = {
  eventId: string;
  duplicate: boolean;
  rewardKind: PrimaryRewardKind;
  baseXp: number;
  baseGold: number;
  bonusXp: number;
  bonusGold: number;
  awardedXp: number;
  awardedGold: number;
  levelBefore: number;
  levelAfter: number;
  levelsGained: number[];
  levelGold: number;
  levelSkillPoints: number;
  profile: PrimaryPlayerProfile;
};

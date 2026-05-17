/** Stats for the test-start 3-wave bucket game (whole run). */
export type BucketTestRunStats = {
  elapsedMs: number;
  wrongCatchCount: number;
  mcqWrongPicks: number;
};

export type BucketTestRewardBreakdown = {
  baseGold: number;
  timeBonusGold: number;
  accuracyBonusGold: number;
  totalGold: number;
  experienceDelta: number;
};

const PAR_MS = 180_000;

/**
 * Rewards for finishing the bucket game on the test start page.
 * Time and accuracy both reflect the full multi-wave run.
 */
export function computeBucketTestRewards(stats: BucketTestRunStats): BucketTestRewardBreakdown {
  const { elapsedMs, wrongCatchCount, mcqWrongPicks } = stats;
  const baseGold = 22;
  const timeBonusGold = Math.min(58, Math.floor(Math.max(0, PAR_MS - elapsedMs) / 3200));
  const accuracyRaw = 52 - wrongCatchCount * 12 - mcqWrongPicks * 7;
  const accuracyBonusGold = Math.min(55, Math.max(6, accuracyRaw));
  const totalGold = baseGold + timeBonusGold + accuracyBonusGold;
  const experienceDelta = 8 + Math.floor(totalGold / 8);
  return { baseGold, timeBonusGold, accuracyBonusGold, totalGold, experienceDelta };
}

import { evaluateCollectionBadges } from "@/lib/collection-badges";
import { getWorldWordDiscoverySummary } from "@/lib/explore/area-discovery";
import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import { xpProgressInLevel } from "@/lib/progress/leveling";
import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { getPlayerLevel, getRewards, type RewardsSnapshot } from "@/lib/progress/rewards";
import { listVocabSetsInMenuOrder } from "@/lib/primary/vocab-continue";
import { listCollectedWords } from "@/lib/word-collection";

const MASTERY_SCORE_THRESHOLD = 0.75;

export type PrimaryProgressBadge = {
  id: string;
  label: string;
  description: string;
  earned: boolean;
};

export type PrimaryProgressModel = {
  level: number;
  gold: number;
  experience: number;
  xpCurrent: number;
  xpRequired: number;
  levelProgress: number;
  mastery: {
    mastered: number;
    learning: number;
    total: number;
  };
  vocabSets: {
    completed: number;
    total: number;
  };
  stickers: number;
  collectedWords: number;
  exploration: {
    percent: number;
    discovered: number;
    total: number;
  };
  badges: PrimaryProgressBadge[];
};

function countMastery(snapshot = readMasterySnapshot()) {
  let mastered = 0;
  let learning = 0;
  let total = 0;
  for (const record of Object.values(snapshot.records)) {
    if (record.targetType && record.targetType !== "word") continue;
    total += 1;
    if (record.masteryScore >= MASTERY_SCORE_THRESHOLD) {
      mastered += 1;
    } else if (record.exposureCount > 0) {
      learning += 1;
    }
  }
  return { mastered, learning, total };
}

/** Live My Progress summary from existing rewards / mastery / collection stores. */
export function buildPrimaryProgressModel(
  rewards: RewardsSnapshot = getRewards(),
): PrimaryProgressModel {
  const xp = xpProgressInLevel(rewards.experience);
  const progress = getProgressSnapshot();
  const vocabTotal = listVocabSetsInMenuOrder().length;
  const vocabCompleted = progress.completedLessonIds.filter((id) =>
    id.startsWith("vocab-"),
  ).length;
  const exploration = getWorldWordDiscoverySummary();
  const badges = evaluateCollectionBadges().map((row) => ({
    id: row.def.id,
    label: row.def.label,
    description: row.def.description,
    earned: row.earned,
  }));

  return {
    level: getPlayerLevel(rewards),
    gold: rewards.gold,
    experience: rewards.experience,
    xpCurrent: xp.current,
    xpRequired: xp.required,
    levelProgress: xp.percent / 100,
    mastery: countMastery(),
    vocabSets: {
      completed: Math.min(vocabCompleted, vocabTotal),
      total: vocabTotal,
    },
    stickers: rewards.ownedStickerIds?.length ?? 0,
    collectedWords: listCollectedWords().length,
    exploration: {
      percent: exploration.percent,
      discovered: exploration.discoveredWordCount,
      total: exploration.totalWordCount,
    },
    badges,
  };
}

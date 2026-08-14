"use client";

import {
  getExploreAreaDiscoverySummary,
  getNextExploreAreaId,
  isExploreAreaDiscoveryComplete,
} from "@/lib/explore/area-discovery";
import { getExploreArea } from "@/lib/explore/areas";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { ExploreEncounterTier } from "@/lib/explore/explore-encounter-roll";
import { recordExploreRunPlayed } from "@/lib/explore/explore-progress";
import { awardRewardsWithMeta } from "@/lib/progress/rewards";
import { bumpDailyQuestProgress } from "@/lib/teststartpage/daily-quests";
import { getWordDisplayInfo } from "@/lib/word-collection";
import { markExplorationNode } from "@/lib/worlds/exploration";
import { awardPrimaryReward } from "@/lib/primary-player/client";

const RUN_COMPLETE_XP = 5;

export type ExploreRunCompleteInput = {
  areaId: ExploreAreaId;
  runSeed: string;
  encounterGold?: number;
  encounterWordIds?: string[];
  encounterTier?: ExploreEncounterTier;
};

export type ExploreRunCompleteResult = {
  areaId: ExploreAreaId;
  chapterTitle: string;
  encounterGold: number;
  encounterWordIds: string[];
  encounterWordLabels: string[];
  encounterTier?: ExploreEncounterTier;
  experienceDelta: number;
  areaPercent: number;
  areaDiscoveredCount: number;
  areaTotalCount: number;
  areaJustCompleted: boolean;
  nextAreaId: ExploreAreaId | null;
  nextAreaTitle: string | null;
};

export function recordExploreRunComplete(
  input: ExploreRunCompleteInput,
): ExploreRunCompleteResult {
  const area = getExploreArea(input.areaId);
  const wasComplete = isExploreAreaDiscoveryComplete(input.areaId);

  recordExploreRunPlayed(input.areaId);
  markExplorationNode({ kind: "explore_area", areaId: input.areaId });

  const completeEventId = `explore:${input.areaId}:${input.runSeed}:complete`;
  const { meta } = awardRewardsWithMeta({
    eventId: completeEventId,
    goldDelta: 0,
    experienceDelta: RUN_COMPLETE_XP,
  });
  const xpGranted = meta.skippedDuplicate ? 0 : RUN_COMPLETE_XP;
  void awardPrimaryReward({
    eventId: `primary:${completeEventId}`,
    rewardKind: "standard_activity",
    activityId: input.areaId,
    source: "explore_activity",
    metadata: { encounterTier: input.encounterTier ?? null },
  }).catch(() => undefined);

  bumpDailyQuestProgress("explore_completions", 1);

  const summary = getExploreAreaDiscoverySummary(input.areaId);
  const areaJustCompleted = !wasComplete && summary.complete;

  const nextAreaId = areaJustCompleted ? getNextExploreAreaId() : null;
  const nextAreaTitle = nextAreaId ? getExploreArea(nextAreaId).title : null;

  const wordIds = input.encounterWordIds ?? [];
  const encounterWordLabels = wordIds.map(
    (id) => getWordDisplayInfo(id).displayLabel,
  );

  return {
    areaId: input.areaId,
    chapterTitle: area.title,
    encounterGold: input.encounterGold ?? 0,
    encounterWordIds: wordIds,
    encounterWordLabels,
    encounterTier: input.encounterTier,
    experienceDelta: xpGranted,
    areaPercent: summary.percent,
    areaDiscoveredCount: summary.discoveredCount,
    areaTotalCount: summary.totalCount,
    areaJustCompleted,
    nextAreaId,
    nextAreaTitle,
  };
}

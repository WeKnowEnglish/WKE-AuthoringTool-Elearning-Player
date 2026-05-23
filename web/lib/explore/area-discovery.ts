"use client";

import { listExploreAreas, getExploreArea, type ExploreAreaId } from "@/lib/explore/areas";
import { listCollectedWords } from "@/lib/word-collection";

export type ExploreAreaDiscoverySummary = {
  areaId: ExploreAreaId;
  title: string;
  order: number;
  discoveredCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
  unlocked: boolean;
  missingWordIds: string[];
};

export type WorldWordDiscoverySummary = {
  discoveredWordCount: number;
  totalWordCount: number;
  percent: number;
  /** Area orders (1–3) with at least one word found. */
  areasWithProgress: number[];
  /** Area orders fully discovered. */
  areasComplete: number[];
  areas: ExploreAreaDiscoverySummary[];
};

function collectedIdSet(): Set<string> {
  return new Set(listCollectedWords().map((w) => w.wordId));
}

export function isExploreAreaUnlocked(areaId: ExploreAreaId, collected?: Set<string>): boolean {
  const area = getExploreArea(areaId);
  if (!area.unlockAfterAreaId) return true;
  return isExploreAreaDiscoveryComplete(area.unlockAfterAreaId, collected);
}

export function isExploreAreaDiscoveryComplete(
  areaId: ExploreAreaId,
  collected?: Set<string>,
): boolean {
  const area = getExploreArea(areaId);
  const ids = collected ?? collectedIdSet();
  return area.discoveryWordIds.every((wordId) => ids.has(wordId));
}

export function getExploreAreaDiscoverySummary(
  areaId: ExploreAreaId,
  collected?: Set<string>,
): ExploreAreaDiscoverySummary {
  const area = getExploreArea(areaId);
  const ids = collected ?? collectedIdSet();
  const missingWordIds = area.discoveryWordIds.filter((w) => !ids.has(w));
  const discoveredCount = area.discoveryWordIds.length - missingWordIds.length;
  const totalCount = area.discoveryWordIds.length;
  const percent =
    totalCount === 0 ? 0 : Math.min(100, Math.round((discoveredCount / totalCount) * 100));
  const complete = missingWordIds.length === 0;
  const unlocked = isExploreAreaUnlocked(areaId, ids);

  return {
    areaId,
    title: area.title,
    order: area.order,
    discoveredCount,
    totalCount,
    percent,
    complete,
    unlocked,
    missingWordIds,
  };
}

export function getWorldWordDiscoverySummary(
  collected?: Set<string>,
): WorldWordDiscoverySummary {
  const ids = collected ?? collectedIdSet();
  const areas = listExploreAreas().map((a) => getExploreAreaDiscoverySummary(a.id, ids));

  let discoveredWordCount = 0;
  let totalWordCount = 0;
  const areasWithProgress: number[] = [];
  const areasComplete: number[] = [];

  for (const summary of areas) {
    totalWordCount += summary.totalCount;
    discoveredWordCount += summary.discoveredCount;
    if (summary.discoveredCount > 0) areasWithProgress.push(summary.order);
    if (summary.complete) areasComplete.push(summary.order);
  }

  const percent =
    totalWordCount === 0 ?
      0
    : Math.min(100, Math.round((discoveredWordCount / totalWordCount) * 100));

  return {
    discoveredWordCount,
    totalWordCount,
    percent,
    areasWithProgress,
    areasComplete,
    areas,
  };
}

/** Next area to explore: first unlocked area that is not complete. */
export function getNextExploreAreaId(collected?: Set<string>): ExploreAreaId | null {
  const ids = collected ?? collectedIdSet();
  for (const area of listExploreAreas()) {
    if (!isExploreAreaUnlocked(area.id, ids)) continue;
    if (!isExploreAreaDiscoveryComplete(area.id, ids)) return area.id;
  }
  return null;
}

export function getExploreAreaEncounterWordPool(areaId: ExploreAreaId): string[] {
  return [...getExploreArea(areaId).encounterWordPool];
}

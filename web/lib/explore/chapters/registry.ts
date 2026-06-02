import { BEDROOM_CHAPTER } from "./bedroom";
import { SCHOOL_CHAPTER } from "./school";
import { SUPERMARKET_CHAPTER } from "./supermarket";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import {
  EXPLORE_CHAPTER_IDS,
  type ExploreChapterDefinition,
  type ExploreChapterId,
} from "./types";

const CHAPTERS: ExploreChapterDefinition[] = [
  BEDROOM_CHAPTER,
  SCHOOL_CHAPTER,
  SUPERMARKET_CHAPTER,
];

const BY_ID = new Map<ExploreChapterId, ExploreChapterDefinition>(
  CHAPTERS.map((c) => [c.id, c]),
);

const BY_AREA = new Map<ExploreAreaId, ExploreChapterDefinition>(
  CHAPTERS.map((c) => [c.areaId, c]),
);

export function listExploreChapters(): ExploreChapterDefinition[] {
  return [...CHAPTERS].sort((a, b) => a.order - b.order);
}

export function getExploreChapter(id: ExploreChapterId): ExploreChapterDefinition {
  const chapter = BY_ID.get(id);
  if (!chapter) throw new Error(`Unknown explore chapter: ${id}`);
  return chapter;
}

export function tryGetExploreChapter(id: string): ExploreChapterDefinition | null {
  if (!BY_ID.has(id as ExploreChapterId)) return null;
  return getExploreChapter(id as ExploreChapterId);
}

export function getExploreChapterForArea(
  areaId: ExploreAreaId,
): ExploreChapterDefinition {
  const chapter = BY_AREA.get(areaId);
  if (!chapter) {
    throw new Error(
      `No explore chapter for area: ${areaId} (area may use playMode "scene")`,
    );
  }
  return chapter;
}

export function getExploreChapterIds(): ExploreChapterId[] {
  return [...EXPLORE_CHAPTER_IDS];
}

/** @deprecated Use {@link getExploreChapterForArea}. */
export function getExploreChapterForWorldLevel(
  worldLevelId: string,
): ExploreChapterDefinition | null {
  const levelToArea: Record<string, ExploreAreaId> = {
    "w1-l1": "bedroom",
    "w1-l2": "school",
    "w1-l3": "supermarket",
  };
  const areaId = levelToArea[worldLevelId];
  if (!areaId) return null;
  return BY_AREA.get(areaId) ?? null;
}

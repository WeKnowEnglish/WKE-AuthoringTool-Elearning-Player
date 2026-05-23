import type { ExploreChapterId } from "@/lib/explore/chapters/types";

/** Place-themed explore zone (not 1:1 with vocab quiz topics). */
export const EXPLORE_AREA_IDS = ["bedroom", "school", "supermarket"] as const;

export type ExploreAreaId = (typeof EXPLORE_AREA_IDS)[number];

export type ExploreAreaDefinition = {
  id: ExploreAreaId;
  title: string;
  subtitle: string;
  /** 1-based order on the world strip. */
  order: number;
  /** Words the student must collect (via explore loot) to finish this area and unlock the next. */
  discoveryWordIds: string[];
  /**
   * Pool for encounter random loot (includes discovery words; can repeat across runs).
   * Gates may teach a subset each run.
   */
  encounterWordPool: string[];
  /** `null` = always available (first area). */
  unlockAfterAreaId: ExploreAreaId | null;
  /** Run payload for this area's explore activity. */
  chapterId: ExploreChapterId;
};

export function isExploreAreaId(id: string): id is ExploreAreaId {
  return (EXPLORE_AREA_IDS as readonly string[]).includes(id);
}

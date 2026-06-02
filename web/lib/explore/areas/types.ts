import type { ExploreChapterId } from "@/lib/explore/chapters/types";
import type { ExploreSceneId } from "@/lib/explore/scenes/types";

/** Place-themed explore zone (not 1:1 with vocab quiz topics). */
export const EXPLORE_AREA_IDS = ["bedroom", "school", "supermarket"] as const;

export type ExploreAreaId = (typeof EXPLORE_AREA_IDS)[number];

export type ExploreAreaPlayMode = "run" | "scene";

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
  /** Side-scroll runner (school, supermarket) or free-roam scene (bedroom MVP). */
  playMode: ExploreAreaPlayMode;
  /** Runner chapter when `playMode` is `"run"`. */
  chapterId?: ExploreChapterId;
  /** Roam scene when `playMode` is `"scene"`. */
  sceneId?: ExploreSceneId;
};

export function isExploreAreaId(id: string): id is ExploreAreaId {
  return (EXPLORE_AREA_IDS as readonly string[]).includes(id);
}

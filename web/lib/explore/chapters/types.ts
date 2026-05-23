import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { ExplorePayload } from "@/lib/lesson-schemas";

/** Bundled explore run payloads (one per place-themed area). */
export const EXPLORE_CHAPTER_IDS = [
  "bedroom",
  "school",
  "supermarket",
] as const;

export type ExploreChapterId = (typeof EXPLORE_CHAPTER_IDS)[number];

export type ExploreChapterDefinition = {
  id: ExploreChapterId;
  areaId: ExploreAreaId;
  /** Display title on lobby and completion summary. */
  title: string;
  subtitle: string;
  /** Ordered chapter index (1 = first on the world strip). */
  order: number;
  payload: ExplorePayload;
};

export function isExploreChapterId(id: string): id is ExploreChapterId {
  return (EXPLORE_CHAPTER_IDS as readonly string[]).includes(id);
}

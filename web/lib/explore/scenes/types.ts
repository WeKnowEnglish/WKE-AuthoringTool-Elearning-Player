import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { Rect } from "@/lib/teststartpage/chase-game-physics";

export const EXPLORE_SCENE_IDS = [
  "home_help_brother",
  "school_help_brother",
  "bakery_recipe_rescue",
] as const;

export type ExploreSceneId = (typeof EXPLORE_SCENE_IDS)[number];

export type ExploreSceneZoneId = "living_room" | "kitchen" | "bedroom";

export type ExploreSceneDoorwayDef = {
  /** Center of doorway opening (map pixels). */
  x: number;
  y: number;
  label: string;
};

export type ExploreSceneMapDef = {
  widthPx: number;
  heightPx: number;
  backgroundUrl: string;
  collisionRects: Rect[];
  /** Optional markers so students see where to walk between zones. */
  doorways?: ExploreSceneDoorwayDef[];
};

export type ExploreSceneZoneDef = {
  id: ExploreSceneZoneId;
  label: string;
  bounds: Rect;
};

export type ExploreSceneWordPickupDef = {
  pickupId: string;
  wordId: string;
  zone: ExploreSceneZoneId;
  objectLabel: string;
  x: number;
  y: number;
  interactRadius?: number;
};

export type ExploreSceneMaterialPickupDef = {
  pickupId: string;
  materialId: string;
  label: string;
  zone: ExploreSceneZoneId;
  x: number;
  y: number;
  interactRadius?: number;
};

export type ExploreSceneBrotherDef = {
  x: number;
  y: number;
  zone: ExploreSceneZoneId;
  interactRadius?: number;
};

export type ExploreSceneIntroDef = {
  title: string;
  body_text: string;
  read_aloud_text?: string;
  image_url?: string;
};

export type ExploreSceneClozeSentenceDef = {
  id: string;
  template: string;
  blankId: string;
  /** Word ids whose lemmas are acceptable (typically one primary word). */
  wordIds: string[];
};

export type ExploreSceneClozeDef = {
  body_text?: string;
  image_url?: string;
  sentences: ExploreSceneClozeSentenceDef[];
};

export type ExploreSceneEndingDef = {
  title: string;
  body_text: string;
  read_aloud_text?: string;
  image_url?: string;
};

export type ExploreSceneDefinition = {
  id: ExploreSceneId;
  areaId: ExploreAreaId;
  title: string;
  subtitle: string;
  /** 1-based order for scene chain UI. */
  order: number;
  intro: ExploreSceneIntroDef;
  map: ExploreSceneMapDef;
  zones: ExploreSceneZoneDef[];
  brother: ExploreSceneBrotherDef;
  wordPickups: ExploreSceneWordPickupDef[];
  materialPickups: ExploreSceneMaterialPickupDef[];
  cloze: ExploreSceneClozeDef;
  ending: ExploreSceneEndingDef;
  /** Next scene in chain (may be locked in MVP). */
  nextSceneId: ExploreSceneId | null;
};

export function isExploreSceneId(id: string): id is ExploreSceneId {
  return (EXPLORE_SCENE_IDS as readonly string[]).includes(id);
}

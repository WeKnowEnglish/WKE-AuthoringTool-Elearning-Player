import { HOME_HELP_BROTHER_SCENE } from "./home-help-brother";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import {
  EXPLORE_SCENE_IDS,
  type ExploreSceneDefinition,
  type ExploreSceneId,
} from "./types";

/** Placeholder for scene chain; not playable in MVP. */
const SCHOOL_HELP_BROTHER_STUB: ExploreSceneDefinition = {
  id: "school_help_brother",
  areaId: "school",
  title: "School — Help Brother",
  subtitle: "Coming soon",
  order: 2,
  intro: {
    title: "Coming soon",
    body_text: "This scene is not ready yet.",
  },
  map: {
    widthPx: 960,
    heightPx: 540,
    backgroundUrl:
      "https://placehold.co/960x540/e0f2fe/0c4a6e?text=School+scene+coming+soon",
    collisionRects: [{ x: 0, y: 0, w: 960, h: 540 }],
  },
  zones: [],
  brother: { x: 480, y: 270, zone: "living_room" },
  wordPickups: [],
  materialPickups: [],
  cloze: { sentences: [] },
  ending: { title: "Coming soon", body_text: "" },
  nextSceneId: null,
};

const SCENES: ExploreSceneDefinition[] = [
  HOME_HELP_BROTHER_SCENE,
  SCHOOL_HELP_BROTHER_STUB,
];

const BY_ID = new Map<ExploreSceneId, ExploreSceneDefinition>(
  SCENES.map((s) => [s.id, s]),
);

const BY_AREA = new Map<ExploreAreaId, ExploreSceneDefinition>([
  [HOME_HELP_BROTHER_SCENE.areaId, HOME_HELP_BROTHER_SCENE],
]);

/** Scenes that students can play in MVP. */
const PLAYABLE_SCENE_IDS: ExploreSceneId[] = ["home_help_brother"];

export function listExploreScenes(): ExploreSceneDefinition[] {
  return [...SCENES].sort((a, b) => a.order - b.order);
}

export function getExploreScene(id: ExploreSceneId): ExploreSceneDefinition {
  const scene = BY_ID.get(id);
  if (!scene) throw new Error(`Unknown explore scene: ${id}`);
  return scene;
}

export function tryGetExploreScene(id: string): ExploreSceneDefinition | null {
  if (!BY_ID.has(id as ExploreSceneId)) return null;
  return getExploreScene(id as ExploreSceneId);
}

export function getExploreSceneForArea(areaId: ExploreAreaId): ExploreSceneDefinition {
  const scene = BY_AREA.get(areaId);
  if (!scene) throw new Error(`No explore scene for area: ${areaId}`);
  return scene;
}

export function getExploreSceneIds(): ExploreSceneId[] {
  return [...EXPLORE_SCENE_IDS];
}

export function isScenePlayable(sceneId: ExploreSceneId): boolean {
  return PLAYABLE_SCENE_IDS.includes(sceneId);
}

export function isSceneUnlocked(sceneId: ExploreSceneId): boolean {
  return isScenePlayable(sceneId);
}

export function getNextSceneId(
  currentId: ExploreSceneId,
): ExploreSceneId | null {
  const scene = getExploreScene(currentId);
  return scene.nextSceneId;
}

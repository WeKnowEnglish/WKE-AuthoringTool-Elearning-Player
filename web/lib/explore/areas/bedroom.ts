import type { ExploreAreaDefinition } from "./types";
import { assertExploreWordIds } from "./validate-words";

const DISCOVERY = assertExploreWordIds(
  ["bed", "desk", "closet", "lamp", "rug", "window"],
  "bedroom area",
);

const POOL = assertExploreWordIds(
  [...DISCOVERY, "door", "chair", "mirror", "toy", "clock"],
  "bedroom encounter pool",
);

export const BEDROOM_AREA: ExploreAreaDefinition = {
  id: "bedroom",
  title: "Home — Help Brother",
  subtitle: "Collect words and things for homework",
  order: 1,
  discoveryWordIds: DISCOVERY,
  encounterWordPool: POOL,
  unlockAfterAreaId: null,
  playMode: "scene",
  sceneId: "home_help_brother",
};

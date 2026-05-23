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
  title: "My bedroom",
  subtitle: "Find things in your room",
  order: 1,
  discoveryWordIds: DISCOVERY,
  encounterWordPool: POOL,
  unlockAfterAreaId: null,
  chapterId: "bedroom",
};

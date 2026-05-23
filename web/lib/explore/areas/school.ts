import type { ExploreAreaDefinition } from "./types";
import { assertExploreWordIds } from "./validate-words";

const DISCOVERY = assertExploreWordIds(
  ["book", "pencil", "teacher", "chair", "classroom", "student"],
  "school area",
);

const POOL = assertExploreWordIds(
  [...DISCOVERY, "desk", "eraser", "ruler", "notebook", "read", "learn"],
  "school encounter pool",
);

export const SCHOOL_AREA: ExploreAreaDefinition = {
  id: "school",
  title: "School",
  subtitle: "Discover classroom words",
  order: 2,
  discoveryWordIds: DISCOVERY,
  encounterWordPool: POOL,
  unlockAfterAreaId: "bedroom",
  chapterId: "school",
};

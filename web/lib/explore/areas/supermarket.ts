import type { ExploreAreaDefinition } from "./types";
import { assertExploreWordIds } from "./validate-words";

const DISCOVERY = assertExploreWordIds(
  ["apple", "milk", "bread", "egg", "banana", "juice"],
  "supermarket area",
);

const POOL = assertExploreWordIds(
  [...DISCOVERY, "water", "rice", "fish", "cheese", "carrot", "orange", "bag"],
  "supermarket encounter pool",
);

export const SUPERMARKET_AREA: ExploreAreaDefinition = {
  id: "supermarket",
  title: "Supermarket",
  subtitle: "Explore the aisles",
  order: 3,
  discoveryWordIds: DISCOVERY,
  encounterWordPool: POOL,
  unlockAfterAreaId: "school",
  chapterId: "supermarket",
};

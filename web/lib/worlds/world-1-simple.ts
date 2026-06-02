import type { WorldDef } from "@/lib/worlds/types";

/**
 * World 1 — three place-themed explore areas.
 * Progress = words collected per area; next area unlocks when the previous is complete.
 * Vocabulary practice sets remain in the Learn room (not counted on this map).
 */
export const WORLD_1_SIMPLE: WorldDef = {
  id: "world_1",
  name: "Simple World",
  tagline: "Explore places and collect words",
  theme: {
    sky: "#bae6fd",
    grass: "#86efac",
    platformTop: "#4ade80",
    platformSide: "#22c55e",
    platformEdge: "#15803d",
    ink: "#152668",
  },
  levels: [
    {
      id: "w1-bedroom",
      index: 1,
      title: "Home — Help Brother",
      subtitle: "Explore the house for homework",
      explorationNodes: [{ kind: "explore_area", areaId: "bedroom" }],
    },
    {
      id: "w1-school",
      index: 2,
      title: "School",
      subtitle: "Discover classroom words",
      explorationNodes: [{ kind: "explore_area", areaId: "school" }],
    },
    {
      id: "w1-supermarket",
      index: 3,
      title: "Supermarket",
      subtitle: "Explore the aisles",
      explorationNodes: [{ kind: "explore_area", areaId: "supermarket" }],
    },
  ],
};

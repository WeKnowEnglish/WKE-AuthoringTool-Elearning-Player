import type { WorldDef } from "@/lib/worlds/types";

/** World 1 — everyday topics: food, animals, weather, school, body, jobs, toys. */
export const WORLD_1_SIMPLE: WorldDef = {
  id: "world_1",
  name: "Simple World",
  tagline: "Food, animals, weather, and everyday places",
  theme: {
    sky: "#bae6fd",
    grass: "#86efac",
    platformTop: "#4ade80",
    platformSide: "#22c55e",
    platformEdge: "#15803d",
    ink: "#152668",
  },
  explorationHubNodes: [
    { kind: "vocab_hub", hubId: "food" },
    { kind: "vocab_hub", hubId: "animals" },
    { kind: "vocab_hub", hubId: "school" },
    { kind: "vocab_hub", hubId: "body" },
    { kind: "vocab_hub", hubId: "jobs" },
  ],
  levels: [
    {
      id: "w1-l1",
      index: 1,
      title: "Morning table",
      subtitle: "Breakfast words",
      explorationNodes: [{ kind: "vocab_set", setId: "breakfast_food" }],
    },
    {
      id: "w1-l2",
      index: 2,
      title: "Fruit bowl",
      subtitle: "Fruit vocabulary",
      explorationNodes: [{ kind: "vocab_set", setId: "food_fruit" }],
    },
    {
      id: "w1-l3",
      index: 3,
      title: "Meals and treats",
      subtitle: "Meals and snacks",
      explorationNodes: [
        { kind: "vocab_set", setId: "food_meals" },
        { kind: "vocab_set", setId: "food_snacks" },
      ],
    },
    {
      id: "w1-l4",
      index: 4,
      title: "Wild woods",
      subtitle: "Wild animals",
      explorationNodes: [{ kind: "vocab_set", setId: "wild_animals" }],
    },
    {
      id: "w1-l5",
      index: 5,
      title: "Friends and farm",
      subtitle: "Pets and farm animals",
      explorationNodes: [
        { kind: "vocab_set", setId: "pets" },
        { kind: "vocab_set", setId: "farm_animals" },
      ],
    },
    {
      id: "w1-l6",
      index: 6,
      title: "Ocean bay",
      subtitle: "Sea animals",
      explorationNodes: [{ kind: "vocab_set", setId: "sea_animals" }],
    },
    {
      id: "w1-l7",
      index: 7,
      title: "Sky and seasons",
      subtitle: "Weather words",
      explorationNodes: [{ kind: "vocab_set", setId: "weather_words" }],
    },
    {
      id: "w1-l8",
      index: 8,
      title: "What we wear",
      subtitle: "Everyday clothes",
      explorationNodes: [{ kind: "vocab_set", setId: "clothes_everyday" }],
    },
    {
      id: "w1-l9",
      index: 9,
      title: "School and town",
      subtitle: "School supplies and activities",
      explorationNodes: [
        { kind: "vocab_set", setId: "school_supplies" },
        { kind: "vocab_set", setId: "school_activities" },
      ],
    },
    {
      id: "w1-l10",
      index: 10,
      title: "People and play",
      subtitle: "Body, jobs, and toys",
      explorationNodes: [
        { kind: "vocab_set", setId: "body_head_face" },
        { kind: "vocab_set", setId: "body_limbs_inside" },
        { kind: "vocab_set", setId: "jobs_community" },
        { kind: "vocab_set", setId: "jobs_creative" },
        { kind: "vocab_set", setId: "toys_everyday" },
      ],
    },
  ],
};

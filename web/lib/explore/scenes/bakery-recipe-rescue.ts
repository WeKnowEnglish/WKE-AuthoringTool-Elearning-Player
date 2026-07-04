import { assertExploreWordIds } from "@/lib/explore/areas/validate-words";
import { BREAKFAST_FOOD_MEDIA_URLS } from "@/lib/vocabulary-templates/sets/food-media";
import type { ExploreSceneDefinition } from "./types";

const MAP_W = 960;
const MAP_H = 540;

const BAKERY_WORDS = assertExploreWordIds(
  ["bread", "milk", "egg", "jam"],
  "bakery_recipe_rescue word pickups",
);

const COLLISION_RECTS = [
  { x: 0, y: 0, w: MAP_W, h: 24 },
  { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
  { x: 0, y: 0, w: 24, h: MAP_H },
  { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
  { x: 24, y: 280, w: 136, h: 20 },
  { x: 400, y: 280, w: 80, h: 20 },
  { x: 480, y: 24, w: 20, h: 146 },
  { x: 480, y: 360, w: 20, h: 156 },
] as const;

const MAP_BG =
  "https://placehold.co/960x540/fef3c7/92400e?text=Bakery+floor+%7C+Kitchen+%7C+Storage";

const media = BREAKFAST_FOOD_MEDIA_URLS;

/** Daily Bakery Quest EXPLORER phase — golden reference scene. */
export const BAKERY_RECIPE_RESCUE_SCENE: ExploreSceneDefinition = {
  id: "bakery_recipe_rescue",
  areaId: "supermarket",
  title: "Bakery — Recipe Rescue",
  subtitle: "Collect ingredients and help Mai finish the recipe",
  order: 3,
  intro: {
    title: "Find the ingredients",
    body_text:
      "Walk around the bakery. Collect bread, milk, eggs, and jam. Then help Mai finish the sentences.",
    read_aloud_text:
      "Walk around the bakery and collect the ingredients Mai needs.",
    image_url:
      "https://placehold.co/800x400/fef3c7/92400e?text=Bakery+quest",
  },
  map: {
    widthPx: MAP_W,
    heightPx: MAP_H,
    backgroundUrl: MAP_BG,
    collisionRects: [...COLLISION_RECTS],
    doorways: [
      { x: 280, y: 292, label: "Kitchen ↓" },
      { x: 468, y: 268, label: "Storage →" },
    ],
  },
  zones: [
    {
      id: "living_room",
      label: "Shop floor",
      bounds: { x: 24, y: 24, w: 456, h: 256 },
    },
    {
      id: "kitchen",
      label: "Baking area",
      bounds: { x: 24, y: 300, w: 456, h: 216 },
    },
    {
      id: "bedroom",
      label: "Storage room",
      bounds: { x: 500, y: 24, w: 436, h: 492 },
    },
  ],
  brother: {
    x: 700,
    y: 200,
    zone: "bedroom",
    interactRadius: 56,
  },
  wordPickups: [
    {
      pickupId: "pickup_bread",
      wordId: BAKERY_WORDS[0]!,
      zone: "living_room",
      objectLabel: "Bread",
      x: 120,
      y: 180,
    },
    {
      pickupId: "pickup_milk",
      wordId: BAKERY_WORDS[1]!,
      zone: "kitchen",
      objectLabel: "Milk",
      x: 200,
      y: 380,
    },
    {
      pickupId: "pickup_egg",
      wordId: BAKERY_WORDS[2]!,
      zone: "kitchen",
      objectLabel: "Eggs",
      x: 320,
      y: 400,
    },
    {
      pickupId: "pickup_jam",
      wordId: BAKERY_WORDS[3]!,
      zone: "bedroom",
      objectLabel: "Jam",
      x: 600,
      y: 300,
    },
  ],
  materialPickups: [],
  cloze: {
    body_text: "Help Mai finish the recipe card.",
    sentences: [
      {
        id: "cloze_1",
        template: "We use __1__ and milk.",
        blankId: "1",
        wordIds: ["bread"],
      },
      {
        id: "cloze_2",
        template: "I need __1__ for baking.",
        blankId: "1",
        wordIds: ["egg"],
      },
    ],
  },
  ending: {
    title: "Recipe complete!",
    body_text: "You found all the ingredients. The bakery can open!",
    read_aloud_text: "Great job! Mai can bake breakfast now.",
    image_url:
      "https://placehold.co/800x400/fef3c7/92400e?text=Recipe+complete",
  },
  nextSceneId: null,
};

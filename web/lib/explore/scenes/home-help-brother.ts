import { assertExploreWordIds } from "@/lib/explore/areas/validate-words";
import type { ExploreSceneDefinition } from "./types";

const MAP_W = 960;
const MAP_H = 540;

const DISCOVERY_WORDS = assertExploreWordIds(
  ["bed", "desk", "closet", "lamp", "rug", "window"],
  "home_help_brother word pickups",
);

/**
 * Outer walls + furniture. Doorways are gaps in the interior dividers:
 * - y≈280: opening x 160–400 (living room ↔ kitchen)
 * - x≈480: opening y 170–360 (left rooms ↔ bedroom)
 */
const COLLISION_RECTS = [
  { x: 0, y: 0, w: MAP_W, h: 24 },
  { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
  { x: 0, y: 0, w: 24, h: MAP_H },
  { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
  { x: 24, y: 280, w: 136, h: 20 },
  { x: 400, y: 280, w: 80, h: 20 },
  { x: 480, y: 24, w: 20, h: 146 },
  { x: 480, y: 360, w: 20, h: 156 },
  { x: 120, y: 140, w: 160, h: 48 },
  { x: 40, y: 360, w: 200, h: 60 },
  { x: 700, y: 380, w: 180, h: 48 },
] as const;

const MAP_DOORWAYS = [
  { x: 280, y: 292, label: "Kitchen ↓" },
  { x: 468, y: 268, label: "Bedroom →" },
] as const;

const BG =
  "https://placehold.co/960x540/e9d5ff/4c1d95?text=Home+-+Living+room+%7C+Kitchen+%7C+Bedroom";

export const HOME_HELP_BROTHER_SCENE: ExploreSceneDefinition = {
  id: "home_help_brother",
  areaId: "bedroom",
  title: "Home — Help Brother",
  subtitle: "Collect words and things for homework",
  order: 1,
  intro: {
    title: "Brother needs help",
    body_text:
      "Your brother is stuck on his English homework. Walk around the house, collect the words and items he needs, then help him finish the sentences.",
    read_aloud_text:
      "Your brother is stuck on his English homework. Walk around the house and collect what he needs.",
    image_url:
      "https://placehold.co/800x400/f5f3ff/4c1d95?text=Homework+help",
  },
  map: {
    widthPx: MAP_W,
    heightPx: MAP_H,
    backgroundUrl: BG,
    collisionRects: [...COLLISION_RECTS],
    doorways: [...MAP_DOORWAYS],
  },
  zones: [
    {
      id: "living_room",
      label: "Living room",
      bounds: { x: 24, y: 24, w: 456, h: 256 },
    },
    {
      id: "kitchen",
      label: "Kitchen",
      bounds: { x: 24, y: 300, w: 456, h: 216 },
    },
    {
      id: "bedroom",
      label: "Bedroom",
      bounds: { x: 500, y: 24, w: 436, h: 492 },
    },
  ],
  brother: {
    x: 200,
    y: 200,
    zone: "living_room",
    interactRadius: 56,
  },
  wordPickups: [
    {
      pickupId: "pickup_rug",
      wordId: DISCOVERY_WORDS[4]!,
      zone: "living_room",
      objectLabel: "Rug",
      x: 360,
      y: 220,
    },
    {
      pickupId: "pickup_lamp",
      wordId: DISCOVERY_WORDS[3]!,
      zone: "living_room",
      objectLabel: "Lamp",
      x: 80,
      y: 100,
    },
    {
      pickupId: "pickup_window",
      wordId: DISCOVERY_WORDS[5]!,
      zone: "kitchen",
      objectLabel: "Window",
      x: 200,
      y: 380,
    },
    {
      pickupId: "pickup_bed",
      wordId: DISCOVERY_WORDS[0]!,
      zone: "bedroom",
      objectLabel: "Bed",
      x: 720,
      y: 120,
    },
    {
      pickupId: "pickup_desk",
      wordId: DISCOVERY_WORDS[1]!,
      zone: "bedroom",
      objectLabel: "Desk",
      x: 600,
      y: 280,
    },
    {
      pickupId: "pickup_closet",
      wordId: DISCOVERY_WORDS[2]!,
      zone: "bedroom",
      objectLabel: "Closet",
      x: 860,
      y: 160,
    },
  ],
  materialPickups: [
    {
      pickupId: "pickup_pencil",
      materialId: "pencil",
      label: "Pencil",
      zone: "living_room",
      x: 320,
      y: 160,
    },
    {
      pickupId: "pickup_homework",
      materialId: "homework_sheet",
      label: "Homework sheet",
      zone: "bedroom",
      x: 640,
      y: 400,
    },
  ],
  cloze: {
    body_text: "Put the words you found into brother's homework sentences.",
    image_url:
      "https://placehold.co/800x320/f5f3ff/4c1d95?text=Homework+sentences",
    sentences: [
      {
        id: "cloze_1",
        template: "I do my homework on the __1__.",
        blankId: "1",
        wordIds: ["desk"],
      },
      {
        id: "cloze_2",
        template: "I sleep in my __1__ at night.",
        blankId: "1",
        wordIds: ["bed"],
      },
      {
        id: "cloze_3",
        template: "I turn on the __1__ when it gets dark.",
        blankId: "1",
        wordIds: ["lamp"],
      },
    ],
  },
  ending: {
    title: "Homework done!",
    body_text:
      "Brother finishes his homework. He says thank you for finding all the words and bringing his pencil and worksheet.",
    read_aloud_text: "Great job! Brother finished his homework. Thank you for helping!",
    image_url:
      "https://placehold.co/800x400/dcfce7/14532d?text=Great+job",
  },
  nextSceneId: "school_help_brother",
};

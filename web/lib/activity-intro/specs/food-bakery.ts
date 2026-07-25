import { BREAKFAST_FOOD_MEDIA_URLS } from "@/lib/vocabulary-templates/sets/food-media";
import type { ActivityIntroItemSpec, ActivityIntroSpec } from "@/lib/activity-intro/types";

/**
 * Media-library Bakery photo — kept for later art swaps; comic stage is preferred for kids.
 * @see teacher media_assets id 382c93df-2d06-4223-82a2-2af20ed0ab83
 */
export const FOOD_BAKERY_INTRO_BACKGROUND_URL =
  "https://vmqvhzghfbwcfnxittta.supabase.co/storage/v1/object/public/lesson_media/8b0f1d53-aeb0-42e0-af1c-b1d07bffc02f/d9f3ed54-0c86-484d-a6b6-1c7945335959-Bakery.png";

/** Bright comic stage (no photographic room). */
export const FOOD_BAKERY_STAGE_COLOR = "#7dd3fc";

/**
 * Primary portal mascot (transparent PNG, waving).
 * Prefer `/landing/primary-mascot.png` over `/assets/Mascot girl…` (white studio BG).
 */
export const FOOD_BAKERY_HOST_CHARACTER_URL = "/landing/primary-mascot.png";

const bread = BREAKFAST_FOOD_MEDIA_URLS.bread!;
const milk = BREAKFAST_FOOD_MEDIA_URLS.milk!;
const eggs = BREAKFAST_FOOD_MEDIA_URLS.eggs!;
const jam = BREAKFAST_FOOD_MEDIA_URLS.jam!;

function hostCharacter(
  id: string,
  layout: { x: number; y: number; w: number; h: number },
  delayMs: number,
): ActivityIntroItemSpec {
  return {
    id,
    name: "Host",
    imageUrl: FOOD_BAKERY_HOST_CHARACTER_URL,
    ...layout,
    zIndex: 7,
    showCard: false,
    enter: { preset: "slide_up", duration_ms: 550, delay_ms: delayMs },
    idle: {
      id: `${id}-bob`,
      preset: "gentle_float",
      amplitude: 0.35,
      period_ms: 2600,
    },
  };
}

function blob(
  id: string,
  colorHex: string,
  layout: { x: number; y: number; w: number; h: number },
  enterDelay: number,
  periodMs: number,
): ActivityIntroItemSpec {
  return {
    id,
    kind: "shape",
    colorHex,
    ...layout,
    zIndex: 0,
    showCard: false,
    enter: { preset: "fade_in", duration_ms: 400, delay_ms: enterDelay },
    idle: {
      id: `${id}-float`,
      preset: "gentle_float",
      amplitude: 0.45,
      period_ms: periodMs,
    },
  };
}

function foodWord(
  id: string,
  name: string,
  imageUrl: string,
  layout: { x: number; y: number; w: number; h: number },
  enter: { preset: "grow" | "wobble" | "slide_up"; delay_ms: number },
  idle: { preset: "gentle_float" | "wobble_loop" | "pulse"; period_ms: number },
): ActivityIntroItemSpec {
  return {
    id,
    name,
    imageUrl,
    ...layout,
    zIndex: 4,
    showCard: false,
    enter: { preset: enter.preset, duration_ms: 550, delay_ms: enter.delay_ms },
    idle: {
      id: `${id}-idle`,
      preset: idle.preset,
      amplitude: 0.55,
      period_ms: idle.period_ms,
    },
  };
}

function speechBubble(
  id: string,
  text: string,
  layout: { x: number; y: number; w: number; h: number },
  delayMs: number,
): ActivityIntroItemSpec[] {
  return [
    {
      id: `${id}-bg`,
      kind: "shape",
      colorHex: "#fef08a",
      ...layout,
      zIndex: 5,
      showCard: false,
      enter: { preset: "grow", duration_ms: 420, delay_ms: delayMs },
      idle: {
        id: `${id}-bg-breathe`,
        preset: "breathe",
        amplitude: 0.25,
        period_ms: 2600,
      },
    },
    {
      id: `${id}-text`,
      kind: "text",
      text,
      textColor: "#0f172a",
      textSizePx: 34,
      x: layout.x + 1,
      y: layout.y + 1,
      w: layout.w - 2,
      h: layout.h - 2,
      zIndex: 6,
      showCard: false,
      enter: { preset: "fade_in", duration_ms: 350, delay_ms: delayMs + 180 },
    },
  ];
}

/** Comic-stage bakery intro: floating blobs + speech + bobbing food (no photo BG). */
export const FOOD_BAKERY_ACTIVITY_INTRO: ActivityIntroSpec = {
  introId: "food-bakery",
  topicLabel: "Breakfast food",
  pages: [
    {
      id: "intro-situation",
      title: "Missing recipes",
      backgroundColor: FOOD_BAKERY_STAGE_COLOR,
      bodyText: "Oh no! The recipe cards flew away!",
      readAloudText: "Oh no! The recipe cards flew away!",
      items: [
        blob("blob-a", "#f472b6", { x: -4, y: 8, w: 28, h: 22 }, 0, 2800),
        blob("blob-b", "#a3e635", { x: 78, y: 12, w: 26, h: 20 }, 80, 3200),
        blob("blob-c", "#fb923c", { x: 70, y: 68, w: 34, h: 24 }, 120, 3000),
        ...speechBubble(
          "hook-bubble",
          "Oh no!\nRecipe cards\nflew away!",
          { x: 6, y: 8, w: 48, h: 30 },
          200,
        ),
        hostCharacter("host", { x: 58, y: 18, w: 38, h: 72 }, 280),
        foodWord(
          "word-bread",
          "bread",
          bread,
          { x: 6, y: 48, w: 24, h: 30 },
          { preset: "wobble", delay_ms: 480 },
          { preset: "gentle_float", period_ms: 2200 },
        ),
        foodWord(
          "word-milk",
          "milk",
          milk,
          { x: 32, y: 50, w: 22, h: 32 },
          { preset: "slide_up", delay_ms: 640 },
          { preset: "wobble_loop", period_ms: 2400 },
        ),
      ],
    },
    {
      id: "intro-invite",
      title: "Let's practice",
      backgroundColor: FOOD_BAKERY_STAGE_COLOR,
      bodyText: "Can you help? Let's practice!",
      readAloudText: "Can you help? Let's practice bread, milk, eggs, and jam.",
      items: [
        blob("blob-d", "#c084fc", { x: -6, y: 60, w: 24, h: 22 }, 0, 2900),
        blob("blob-e", "#fde047", { x: 82, y: 6, w: 22, h: 18 }, 60, 3100),
        ...speechBubble(
          "invite-bubble",
          "Can you help?\nLet's practice!",
          { x: 4, y: 6, w: 50, h: 28 },
          150,
        ),
        hostCharacter("host", { x: 60, y: 16, w: 36, h: 70 }, 220),
        foodWord(
          "word-bread",
          "bread",
          bread,
          { x: 2, y: 44, w: 20, h: 30 },
          { preset: "grow", delay_ms: 320 },
          { preset: "gentle_float", period_ms: 2100 },
        ),
        foodWord(
          "word-milk",
          "milk",
          milk,
          { x: 22, y: 46, w: 18, h: 30 },
          { preset: "grow", delay_ms: 440 },
          { preset: "pulse", period_ms: 2300 },
        ),
        foodWord(
          "word-eggs",
          "eggs",
          eggs,
          { x: 40, y: 44, w: 18, h: 30 },
          { preset: "grow", delay_ms: 560 },
          { preset: "wobble_loop", period_ms: 2200 },
        ),
        foodWord(
          "word-jam",
          "jam",
          jam,
          { x: 4, y: 72, w: 18, h: 24 },
          { preset: "grow", delay_ms: 680 },
          { preset: "gentle_float", period_ms: 2500 },
        ),
      ],
    },
  ],
};

import type { PetMood } from "@/lib/pet/types";

/** Default pet pose: studio “happy two legs” scene (not the 4-leg idle loop). */
export const PET_MOOD_SCENE_IDS: Record<PetMood, string> = {
  normal: "scene-happy",
  excited: "scene-happy",
  playful: "scene-downward",
  sad: "scene-sad",
};

export function resolvePetMoodSceneId(mood: PetMood): string {
  return PET_MOOD_SCENE_IDS[mood];
}

/**
 * UI scale so poses with different rig keyframe scales read similar on screen.
 * Body track scale at t=0: `scene-downward` ~0.48, `scene-happy` ~0.97.
 */
const PET_SCENE_DISPLAY_SCALE: Partial<Record<string, number>> = {
  "scene-happy": 0.78,
  "scene-downward": 1.38,
  "scene-sad": 0.85,
};

export function resolvePetSceneDisplayScale(sceneId: string): number {
  const scale = PET_SCENE_DISPLAY_SCALE[sceneId];
  return scale != null && scale > 0 ? scale : 1;
}

export function resolvePetMoodDisplayScale(mood: PetMood): number {
  return resolvePetSceneDisplayScale(resolvePetMoodSceneId(mood));
}

/** Pet Care hub card — boost over default scene scale so the dog fills the card. */
export const PET_CARE_PET_DISPLAY_SCALE = 1.3;

/** Pet position on the Pet Care display card (+Y = down). */
export const PET_CARE_PET_LAYOUT = {
  translateXPx: 0,
  translateYPx: 30,
} as const;

/** Drink mini-game: playful pose reads small beside the blender — use a single boosted scale. */
export const DRINK_MINIGAME_PET_DISPLAY_SCALE = 2.025;

/** Intro playful pose — tuned for the yellow card (50% above the prior 1.35 baseline). */
export const DRINK_MINIGAME_INTRO_PET_DISPLAY_SCALE = 2.025;

/**
 * Screen position for the pet on the blender play screen (inside the playfield box).
 * Tune `right` / `bottom` (px) and `translateX` / `translateY` (px) to match layout.
 */
export const DRINK_MINIGAME_PET_LAYOUT = {
  rightPx: 4,
  bottomPx: 10,
  translateXPx: 161,
  translateYPx: 318,
} as const;

/**
 * Pet position on the drink intro (yellow card).
 * `left` / `bottom` anchor the box; `translateX` / `translateY` nudge in px (+X = right, +Y = down).
 */
export const DRINK_MINIGAME_INTRO_PET_LAYOUT = {
  leftPx: 103,
  bottomPx: 10,
  translateXPx: 50,
  translateYPx: 286,
} as const;

/** Sandwich mini-game playfield companion pet. */
export const SANDWICH_MINIGAME_PET_DISPLAY_SCALE = 2.025;

export const SANDWICH_MINIGAME_PET_LAYOUT = {
  rightPx: 4,
  bottomPx: 10,
  translateXPx: 161,
  translateYPx: 318,
} as const;

/** Nudge sandwich stack (bread, layers, top bun) toward the plate (+Y = down). */
export const SANDWICH_MINIGAME_STACK_TRANSLATE_Y_PX = -150;

/** Scale for filling layers on the stack (bread size unchanged). */
export const SANDWICH_MINIGAME_LAYER_SCALE = 2.5;

/** Vertical step between stacked filling layers (px), scaled with layer scale. */
export const SANDWICH_MINIGAME_LAYER_STACK_OFFSETS_PX = [0, 35, 70, 105] as const;

/** Pull top bun up over fillings (negative margin-top, px). */
export const SANDWICH_MINIGAME_TOP_BREAD_OFFSET_Y_PX = -250;

export const SANDWICH_MINIGAME_INTRO_PET_DISPLAY_SCALE = 2.025;

export const SANDWICH_MINIGAME_INTRO_PET_LAYOUT = {
  leftPx: 103,
  bottomPx: 10,
  translateXPx: 50,
  translateYPx: 286,
} as const;

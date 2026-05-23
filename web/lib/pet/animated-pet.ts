import type { PetMood } from "@/lib/pet/types";

/** Default pet pose: studio “happy two legs” scene (not the 4-leg idle loop). */
export const PET_MOOD_SCENE_IDS: Record<PetMood, string> = {
  normal: "scene-happy",
  excited: "scene-happy",
  playful: "scene-downward",
};

export function resolvePetMoodSceneId(mood: PetMood): string {
  return PET_MOOD_SCENE_IDS[mood];
}

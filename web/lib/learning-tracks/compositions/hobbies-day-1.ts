import type { LearningTrackComposition } from "@/lib/learning-tracks/composition-types";
import { compositionFromRecipe } from "@/lib/learning-tracks/composition";
import { HOBBIES_DAY_1_RECIPE } from "@/lib/learning-tracks/recipes/hobbies-day-1";

/** Editable hobbies Day-1 composition (beat instances with sources + bridge hooks). */
export const HOBBIES_DAY_1_COMPOSITION: LearningTrackComposition =
  compositionFromRecipe(HOBBIES_DAY_1_RECIPE);

export function listLearningTrackCompositions(): LearningTrackComposition[] {
  return [structuredClone(HOBBIES_DAY_1_COMPOSITION)];
}

export function getLearningTrackComposition(
  id: string,
): LearningTrackComposition | undefined {
  return listLearningTrackCompositions().find((entry) => entry.id === id);
}

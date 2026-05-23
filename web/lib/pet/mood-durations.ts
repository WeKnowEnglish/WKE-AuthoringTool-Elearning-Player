import type { PetMood } from "@/lib/pet/types";

/** One-shot mood animation lengths (ms), matching dog-poses.json scene durations. */
export const PET_MOOD_DURATION_MS: Record<PetMood, number> = {
  normal: 3000,
  excited: 3000,
  playful: 8000,
};

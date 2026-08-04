import {
  HOBBIES_DAY_1_COMPOSITION,
  type LearningTrackComposition,
} from "@/lib/learning-tracks/composer";

/** Clone Hobbies Day 1 as a fresh Practice composition for a new track. */
export function seedPracticeComposition(input: {
  trackId: string;
  title: string;
}): LearningTrackComposition {
  const base = structuredClone(HOBBIES_DAY_1_COMPOSITION);
  const title = input.title.trim() || "Untitled practice track";
  const packId = `track-${input.trackId}`;
  return {
    ...base,
    id: `composition-${input.trackId}`,
    packId,
    packTitle: title,
    title,
    beats: base.beats.map((beat, index) => ({
      ...beat,
      id: `${input.trackId}-beat-${index + 1}`,
    })),
  };
}

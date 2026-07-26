import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/** Pilot play URL for a durable Activity Bank row (wired in a later slice). */
export function playPathForStudioActivity(
  format: StudioActivityFormat,
  id: string,
): string {
  const q = `activity=${encodeURIComponent(id)}`;
  if (format === "multiple_choice") return `/pilots/games-mc-quiz?${q}`;
  if (format === "letter_mixup") return `/pilots/games-letter-mixup?${q}`;
  if (format === "flashcards") return `/pilots/games-flashcards?${q}`;
  if (format === "learning_track") return `/pilots/learning-track?${q}`;
  if (format === "vocabulary_list") {
    return `/teacher/activity-builder/vocabulary-lists?activity=${encodeURIComponent(id)}`;
  }
  if (format === "explore_hotspots") {
    return `/teacher/activity-builder/hotspots?activity=${encodeURIComponent(id)}`;
  }
  return `/pilots?${q}`;
}

/** Teacher classes surface with bank focus (UI wired in a later slice). */
export function bankPathForStudioActivity(id: string): string {
  return `/teacher/classes?bank=1&activity=${encodeURIComponent(id)}`;
}

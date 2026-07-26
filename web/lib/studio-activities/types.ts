export type StudioActivityFormat =
  | "multiple_choice"
  | "letter_mixup"
  | "flashcards"
  | "learning_track"
  | "vocabulary_list"
  | "explore_hotspots";

export const STUDIO_ACTIVITY_FORMATS: readonly StudioActivityFormat[] = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
  "learning_track",
  "vocabulary_list",
  "explore_hotspots",
] as const;

export type PublishStudioActivityInput = {
  /** When set, update this teacher-owned row instead of inserting. */
  id?: string | null;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  title?: string | null;
  filename?: string | null;
  source?: Record<string, unknown> | null;
};

export type PublishStudioActivityResult = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  playPath: string;
  bankPath: string;
  created_at: string;
};

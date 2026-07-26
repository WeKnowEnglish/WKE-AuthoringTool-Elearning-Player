/** Browser-local Activity Builder library (IndexedDB). No Supabase in slice 1. */

export type ActivityLibraryFormat =
  | "multiple_choice"
  | "letter_mixup"
  | "vocabulary_list"
  | "listen_and_choose"
  | "flashcards"
  | "sentence_scramble"
  | "fill_blanks"
  | "drag_match"
  | "line_match"
  | "learning_track";

export type ActivityLibraryExportSnapshot = {
  filename: string;
  /** Lesson Player pack JSON (lessonplayer-games-pack). */
  pack: unknown;
  exportedAt: string;
};

export type ActivityLibraryEntry = {
  id: string;
  format: ActivityLibraryFormat;
  name: string;
  updatedAt: string;
  /** Studio authoring document (activity-authoring or vocabulary-list). */
  authoring: unknown;
  lastExport?: ActivityLibraryExportSnapshot;
};

export const ACTIVITY_LIBRARY_DB = "wke-activity-library";
export const ACTIVITY_LIBRARY_STORE = "activities";
export const ACTIVITY_LIBRARY_VERSION = 1;

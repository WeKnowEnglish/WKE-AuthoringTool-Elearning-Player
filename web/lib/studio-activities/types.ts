export type StudioActivityFormat =
  | "multiple_choice"
  | "letter_mixup"
  | "flashcards"
  | "listen_and_choose"
  | "line_match"
  | "true_false"
  | "sentence_scramble"
  | "fill_blanks"
  | "learning_track"
  | "vocabulary_list"
  | "explore_hotspots"
  | "picture_cloze"
  | "verb_table"
  | "sentence_columns"
  | "word_annotation"
  | "picture_writing"
  | "question_writing"
  | "definition_match"
  | "cloze_choice"
  | "cloze_open"
  | "read_and_answer"
  | "picture_story";

export const STUDIO_ACTIVITY_FORMATS: readonly StudioActivityFormat[] = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
  "listen_and_choose",
  "line_match",
  "true_false",
  "sentence_scramble",
  "fill_blanks",
  "learning_track",
  "vocabulary_list",
  "explore_hotspots",
  "picture_cloze",
  "verb_table",
  "sentence_columns",
  "word_annotation",
  "picture_writing",
  "question_writing",
  "definition_match",
  "cloze_choice",
  "cloze_open",
  "read_and_answer",
  "picture_story",
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

import type { ActivityTrackPartKind } from "@/lib/activity-tracks/types";
import type { HomeworkStudioFormat } from "@/lib/class-homework/types";
import type { HomeworkCollectionPartKind } from "@/lib/homework-collections/types";

/** Quiz formats stored as frozen Lesson Player packs inside homework collections. */
export const LP_GRADED_PACK_KINDS = [
  "flashcards",
  "true_false",
  "fill_blanks",
  "wordsearch",
  "crossword",
  "memory",
] as const satisfies readonly ActivityTrackPartKind[];

export type LpGradedPackKind = (typeof LP_GRADED_PACK_KINDS)[number];

/** Formats that award completion credit (no per-item auto scoring). */
export const COMPLETION_LP_STUDIO_FORMATS = [
  "flashcards",
  "wordsearch",
  "crossword",
  "memory",
] as const satisfies readonly HomeworkStudioFormat[];

export type CompletionLpStudioFormat =
  (typeof COMPLETION_LP_STUDIO_FORMATS)[number];

/** Inline homework collection editors (not Lesson Player packs). */
export const INLINE_HOMEWORK_COLLECTION_KINDS = [
  "multiple_choice",
  "letter_mixup",
  "line_match",
  "listen_and_choose",
  "listening_item_match",
  "sentence_scramble",
  "free_response",
  "speaking_prompt",
] as const satisfies readonly HomeworkCollectionPartKind[];

/** Reading / document homework modules (non–Lesson Player shells). */
export const READING_MODULE_KINDS = [
  "read_and_answer",
  "cloze_choice",
  "cloze_open",
  "definition_match",
  "picture_story",
] as const satisfies readonly ActivityTrackPartKind[];

export type ReadingModuleKind = (typeof READING_MODULE_KINDS)[number];

/** Reusable graded parts for both Primary and Secondary blank collections. */
export const GRADED_REUSABLE_PART_KINDS = [
  ...INLINE_HOMEWORK_COLLECTION_KINDS,
  ...LP_GRADED_PACK_KINDS,
  ...READING_MODULE_KINDS,
  "writing_prompt",
] as const satisfies readonly ActivityTrackPartKind[];

export function isReadingModuleKind(
  kind: ActivityTrackPartKind,
): kind is ReadingModuleKind {
  return (READING_MODULE_KINDS as readonly string[]).includes(kind);
}

export function isLpGradedPackKind(kind: ActivityTrackPartKind): kind is LpGradedPackKind {
  return (LP_GRADED_PACK_KINDS as readonly string[]).includes(kind);
}

export function activityTrackKindToStudioFormat(
  kind: LpGradedPackKind,
): HomeworkStudioFormat {
  return kind;
}

export function isCompletionLpStudioFormat(
  format: HomeworkStudioFormat,
): format is CompletionLpStudioFormat {
  return (COMPLETION_LP_STUDIO_FORMATS as readonly string[]).includes(format);
}

export function isInlineHomeworkCollectionKind(
  kind: ActivityTrackPartKind,
): kind is InlineHomeworkCollectionKind {
  return (INLINE_HOMEWORK_COLLECTION_KINDS as readonly string[]).includes(kind);
}

export type InlineHomeworkCollectionKind =
  (typeof INLINE_HOMEWORK_COLLECTION_KINDS)[number];

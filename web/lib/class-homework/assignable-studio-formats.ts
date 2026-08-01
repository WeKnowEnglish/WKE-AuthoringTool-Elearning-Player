import {
  isHomeworkStudioFormat,
  type HomeworkStudioFormat,
} from "@/lib/class-homework/types";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Document-style Activity Bank formats that freeze as dedicated homework payloads
 * (not Lesson Player `studio_activity` packs).
 */
export const DOCUMENT_HOMEWORK_STUDIO_FORMATS = [
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

export type DocumentHomeworkStudioFormat =
  (typeof DOCUMENT_HOMEWORK_STUDIO_FORMATS)[number];

const DOCUMENT_LABELS: Record<DocumentHomeworkStudioFormat, string> = {
  picture_cloze: "Picture cloze",
  verb_table: "Verb table",
  sentence_columns: "Sentence columns",
  word_annotation: "Word annotation",
  picture_writing: "Picture writing",
  question_writing: "Question writing",
  definition_match: "Definition match",
  cloze_choice: "Cloze with choices",
  cloze_open: "Open cloze",
  read_and_answer: "Read and answer",
  picture_story: "Picture story",
};

export function isDocumentHomeworkStudioFormat(
  value: unknown,
): value is DocumentHomeworkStudioFormat {
  return (
    typeof value === "string" &&
    (DOCUMENT_HOMEWORK_STUDIO_FORMATS as readonly string[]).includes(value)
  );
}

/** Quiz packs + document homework modules that can be assigned from the bank. */
export function isAssignableStudioHomeworkFormat(
  format: StudioActivityFormat | string,
): boolean {
  return isHomeworkStudioFormat(format) || isDocumentHomeworkStudioFormat(format);
}

export function assignableStudioHomeworkFormatLabel(
  format: StudioActivityFormat | string,
): string {
  if (isHomeworkStudioFormat(format)) {
    const quiz = format as HomeworkStudioFormat;
    if (quiz === "multiple_choice") return "Multiple choice";
    if (quiz === "letter_mixup") return "Letter scramble";
    if (quiz === "flashcards") return "Flashcards";
    if (quiz === "listen_and_choose") return "Listen and choose";
    if (quiz === "line_match") return "Line match";
    if (quiz === "true_false") return "True / false";
    if (quiz === "sentence_scramble") return "Sentence scramble";
    if (quiz === "fill_blanks") return "Fill in the blanks";
    return "Learning track";
  }
  if (isDocumentHomeworkStudioFormat(format)) {
    return DOCUMENT_LABELS[format];
  }
  return format;
}

export const ASSIGNABLE_DOCUMENT_HOMEWORK_ERROR =
  "Only Activity Bank quizzes, learning tracks, and homework modules (picture cloze, verb table, sentence columns, word annotation, picture writing, question writing, definition match, cloze with choices, open cloze, read and answer, picture story) can be assigned as homework for now.";

import type { McQuizPayload, ScreenPayload } from "@/lib/lesson-schemas";
import type { PackQuizFormat } from "./types";

export type PackQuizMcMode =
  | "word_for_meaning_en"
  | "meaning_for_word_en"
  | "find_lemma";

export type TrueFalsePayload = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "true_false" }
>;
export type LetterMixupPayload = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "letter_mixup" }
>;
export type DragSentencePayload = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "drag_sentence" }
>;

/** MC question saved from pack-quiz compile / sheet. */
export type PackQuizMcCompiledQuestion = {
  id: string;
  wordId: string;
  format: "multiple_choice";
  mode: PackQuizMcMode;
  payload: McQuizPayload;
};

export type PackQuizTrueFalseCompiledQuestion = {
  id: string;
  wordId: string;
  format: "true_false";
  payload: TrueFalsePayload;
};

export type PackQuizLetterScrambleCompiledQuestion = {
  id: string;
  wordId: string;
  format: "letter_scramble";
  /** Stored as lesson `letter_mixup` for the shared player. */
  payload: LetterMixupPayload;
};

export type PackQuizSentenceScrambleCompiledQuestion = {
  id: string;
  wordId: string;
  format: "sentence_scramble";
  /** Stored as lesson `drag_sentence` for the shared player. */
  payload: DragSentencePayload;
};

export type PackQuizCompiledQuestion =
  | PackQuizMcCompiledQuestion
  | PackQuizTrueFalseCompiledQuestion
  | PackQuizLetterScrambleCompiledQuestion
  | PackQuizSentenceScrambleCompiledQuestion;

export function isPackQuizMcQuestion(
  q: PackQuizCompiledQuestion,
): q is PackQuizMcCompiledQuestion {
  return q.format === "multiple_choice";
}

export function packQuizFormatFromPayloadSubtype(
  subtype: string,
): PackQuizFormat | null {
  if (subtype === "mc_quiz") return "multiple_choice";
  if (subtype === "true_false") return "true_false";
  if (subtype === "letter_mixup") return "letter_scramble";
  if (subtype === "drag_sentence") return "sentence_scramble";
  return null;
}

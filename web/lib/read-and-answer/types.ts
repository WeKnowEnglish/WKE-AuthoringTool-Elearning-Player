/** Standalone read-and-answer authoring document (Activity Bank + homework freeze). */

export type ReadAndAnswerOption = {
  id: string;
  text: string;
};

export type ReadAndAnswerQuestion = {
  id: string;
  prompt: string;
  options: ReadAndAnswerOption[];
  correctOptionId: string;
};

export type ReadAndAnswerPassage = {
  title?: string;
  text: string;
  imageUrl?: string;
  imageAlt?: string;
};

export type ReadAndAnswerDocument = {
  version: 1;
  kind: "read-and-answer";
  id: string;
  title: string;
  instructions: string;
  passage: ReadAndAnswerPassage;
  questions: ReadAndAnswerQuestion[];
  shuffleOptions: boolean;
};

/** Playable slice for the dedicated student player. */
export type ReadAndAnswerPlayable = {
  title: string;
  instructions: string;
  passage: ReadAndAnswerPassage;
  questions: ReadAndAnswerQuestion[];
  shuffleOptions: boolean;
};

export const READ_AND_ANSWER_KIND = "read-and-answer" as const;
export const DEFAULT_READ_AND_ANSWER_INSTRUCTIONS =
  "Read the passage. Then answer the questions.";

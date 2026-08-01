/** Standalone picture cloze authoring document (Activity Bank + homework freeze). */

export type PictureClozeItem = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  prompt: string;
  sentenceBefore: string;
  sentenceAfter: string;
  acceptedAnswers: string[];
};

export type PictureClozeDocument = {
  version: 1;
  kind: "picture-cloze";
  id: string;
  title: string;
  instructions: string;
  wordBank: string[];
  items: PictureClozeItem[];
  cefr?: string;
};

/** Playable slice shared by template Part 1 and the standalone player. */
export type PictureClozePlayable = {
  title: string;
  instructions: string;
  wordBank: string[];
  items: PictureClozeItem[];
};

export const PICTURE_CLOZE_KIND = "picture-cloze" as const;
export const DEFAULT_PICTURE_CLOZE_INSTRUCTIONS =
  "Look at each picture. Choose a word from the bank and complete the sentence.";
export const DEFAULT_PICTURE_CLOZE_PROMPT = "Which word fits?";

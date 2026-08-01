/** Standalone picture writing authoring document (Activity Bank + homework freeze). */

export type PictureWritingPrompt = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  question: string;
  promptWords: string[];
  requiredWords: string[];
  sentenceStarter?: string;
  minWords: number;
};

export type PictureWritingDocument = {
  version: 1;
  kind: "picture-writing";
  id: string;
  title: string;
  instructions: string;
  prompts: PictureWritingPrompt[];
  cefr?: string;
};

/** Playable slice shared by template Part 5 and the standalone player. */
export type PictureWritingPlayable = {
  title: string;
  instructions: string;
  prompts: PictureWritingPrompt[];
};

export const PICTURE_WRITING_KIND = "picture-writing" as const;
export const DEFAULT_PICTURE_WRITING_INSTRUCTIONS =
  "Look carefully at each picture. Use the prompt words to write one complete sentence.";

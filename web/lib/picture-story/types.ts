/** Standalone picture-story authoring document (Activity Bank + homework freeze). */

export const PICTURE_STORY_QUESTION_TYPES = [
  "sentence_completion",
  "multiple_choice",
] as const;

export type PictureStoryQuestionType = (typeof PICTURE_STORY_QUESTION_TYPES)[number];

export type PictureStoryFrame = {
  id: string;
  imageUrl: string;
  imageAlt: string;
  text: string;
};

export type PictureStoryOption = {
  id: string;
  text: string;
};

export type PictureStoryQuestion = {
  id: string;
  type: PictureStoryQuestionType;
  prompt: string;
  acceptedAnswers: string[];
  options: PictureStoryOption[];
  correctOptionId: string;
  evidenceFrameId: string;
};

export type PictureStoryDocument = {
  version: 1;
  kind: "picture-story";
  id: string;
  title: string;
  instructions: string;
  frames: PictureStoryFrame[];
  questions: PictureStoryQuestion[];
  allowStoryReviewDuringQuestions: boolean;
};

/** Playable slice for the dedicated student player. */
export type PictureStoryPlayable = {
  title: string;
  instructions: string;
  frames: PictureStoryFrame[];
  questions: PictureStoryQuestion[];
  allowStoryReviewDuringQuestions: boolean;
};

export const PICTURE_STORY_KIND = "picture-story" as const;
export const DEFAULT_PICTURE_STORY_INSTRUCTIONS =
  "Read each picture story page. Then complete the sentences and answer the questions.";

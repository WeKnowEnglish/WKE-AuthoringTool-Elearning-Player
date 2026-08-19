/** Vocabulary-list puzzle formats shared by Quiz Builder and Lesson Player. */

export type GamesWordGameFormat = "wordsearch" | "crossword" | "memory";

export type GamesWordGameItem = {
  id: string;
  word: string;
  /** Crossword clue, and the preferred text match for memory when no picture is present. */
  clue?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
};

export type GamesWordGameInteraction = {
  type: "games";
  format: GamesWordGameFormat;
  quizGroupId: string;
  quizGroupTitle: string;
  promptDefault: string;
  items: GamesWordGameItem[];
  /** Word-search grid side length. The exporter clamps this to fit the longest word. */
  gridSize?: number;
  /** Whether word-search words may run backwards. */
  allowBackwards?: boolean;
  /** Memory cards use pictures when available, then clues, then a duplicate word card. */
  memoryUsePictures?: boolean;
};

export type GamesWordGameAuthoringDocument = {
  version: 1;
  kind: "activity-authoring";
  id: string;
  name: string;
  educationalIntent: {
    objective: string;
    successCriteria: string;
    cefr?: string;
    vocabulary?: string[];
  };
  content: {
    instruction?: string;
    completionMessage?: string;
  };
  interaction: GamesWordGameInteraction;
};

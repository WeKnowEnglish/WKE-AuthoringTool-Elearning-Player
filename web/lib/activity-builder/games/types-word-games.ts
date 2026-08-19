/** Vocabulary-list puzzle formats shared by Quiz Builder and Lesson Player. */

export type GamesWordGameFormat = "wordsearch" | "crossword" | "memory";

/** Text shown on the non-picture side of each memory pair. */
export type GamesMemoryTextMode = "word" | "definition" | "example";

/** Vocabulary field used to generate crossword clues. */
export type GamesCrosswordClueMode =
  | "definition"
  | "example"
  | "definition_or_example";

export type GamesWordGameItem = {
  id: string;
  word: string;
  /** Optional teacher-written crossword clue override. */
  clue?: string;
  definition?: string;
  example?: string;
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
  /** @deprecated Kept only when reading older drafts. Memory now always uses pictures. */
  memoryUsePictures?: boolean;
  /** Text paired with each picture in Memory. */
  memoryTextMode?: GamesMemoryTextMode;
  /** Vocabulary source used for generated Crossword clues. */
  crosswordClueMode?: GamesCrosswordClueMode;
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

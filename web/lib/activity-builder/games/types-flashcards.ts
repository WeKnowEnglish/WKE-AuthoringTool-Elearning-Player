/** Studio Games · Flashcards deck. */

export const GAMES_FLASHCARD_FACES = [
  "word",
  "definition",
  "example",
  "picture",
] as const;

export type GamesFlashcardFace = (typeof GAMES_FLASHCARD_FACES)[number];

export type GamesFlashcardFaceValues = {
  word?: string;
  definition?: string;
  example?: string;
  pictureUrl?: string;
};

export type GamesFlashcardCard = {
  id: string;
  faces: GamesFlashcardFaceValues;
  frontFaces: GamesFlashcardFace[];
  backFaces: GamesFlashcardFace[];
  /** Optional recorded word clip; preferred over TTS (faces.word) when set. */
  promptAudioUrl?: string;
  /** Optional recorded example clip; preferred over TTS (faces.example) when set. */
  exampleAudioUrl?: string;
  /** Optional recorded definition clip; preferred over TTS (faces.definition) when set. */
  definitionAudioUrl?: string;
};

export type GamesFlashcardsInteraction = {
  type: "games";
  format: "flashcards";
  quizGroupId: string;
  quizGroupTitle: string;
  shuffleCardsDefault: boolean;
  /** Default face layout applied to new cards. */
  defaultFrontFaces: GamesFlashcardFace[];
  defaultBackFaces: GamesFlashcardFace[];
  cards: GamesFlashcardCard[];
};

export type GamesFlashcardsAuthoringDocument = {
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
  interaction: GamesFlashcardsInteraction;
};

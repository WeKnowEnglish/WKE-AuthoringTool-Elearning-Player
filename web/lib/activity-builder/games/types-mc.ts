/** Studio Games family — more formats land as separate authoring modules. */

export const GAMES_FORMATS = [
  "multiple_choice",
  "listen_and_choose",
  "flashcards",
  "letter_mixup",
  "sentence_scramble",
  "fill_blanks",
  "drag_match",
  "line_match",
  "true_false",
] as const;
export type GamesFormat = (typeof GAMES_FORMATS)[number];

export type GamesMcOption = {
  id: string;
  label: string;
};

export type GamesMcItem = {
  id: string;
  question: string;
  bodyText?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  /** Recorded/uploaded prompt audio; overrides question TTS in Lesson Player. */
  promptAudioUrl?: string;
  options: GamesMcOption[];
  correctOptionId: string;
  shuffleOptions?: boolean;
};

export type GamesMcQuizInteraction = {
  type: "games";
  format: "multiple_choice";
  quizGroupId: string;
  quizGroupTitle: string;
  /** Default when an item omits shuffleOptions. */
  shuffleOptionsDefault: boolean;
  items: GamesMcItem[];
};

export type GamesAuthoringDocument = {
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
  interaction: GamesMcQuizInteraction;
};

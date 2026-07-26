/** Studio Games · Letter scramble (LP subtype letter_mixup). */

export type GamesLetterMixupItem = {
  id: string;
  targetWord: string;
  hint?: string;
  acceptedWords?: string[];
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  /** Optional recorded clip for picture tap; preferred over TTS when set. */
  imageAudioUrl?: string;
  imageUseTts?: boolean;
  imageReadAloudText?: string;
};

export type GamesLetterMixupInteraction = {
  type: "games";
  format: "letter_mixup";
  quizGroupId: string;
  quizGroupTitle: string;
  /** Shared prompt for each exported screen. */
  promptDefault: string;
  shuffleLettersDefault: boolean;
  caseSensitiveDefault: boolean;
  items: GamesLetterMixupItem[];
};

export type GamesLetterMixupAuthoringDocument = {
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
  interaction: GamesLetterMixupInteraction;
};

/** Studio Games · Sentence scramble (pack format sentence_scramble → LP drag_sentence). */

export type GamesSentenceScrambleItem = {
  id: string;
  /** Whether students only unscramble the answer or first see a separate cue. */
  promptMode?: "scramble_only" | "additional_prompt";
  /** Optional cue shown above the scrambled expanded answer. */
  bodyText?: string;
  /** Correct word order (punctuation stays on tokens). */
  correctOrder: string[];
  imageUrl?: string;
  imageFit?: "cover" | "contain";
};

export type GamesSentenceScrambleInteraction = {
  type: "games";
  format: "sentence_scramble";
  quizGroupId: string;
  quizGroupTitle: string;
  bodyTextDefault: string;
  items: GamesSentenceScrambleItem[];
};

export type GamesSentenceScrambleAuthoringDocument = {
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
  interaction: GamesSentenceScrambleInteraction;
};

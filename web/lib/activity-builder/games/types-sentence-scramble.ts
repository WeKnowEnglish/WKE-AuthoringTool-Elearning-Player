/** Studio Games · Sentence scramble (pack format sentence_scramble → LP drag_sentence). */

export type GamesSentenceScrambleItem = {
  id: string;
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

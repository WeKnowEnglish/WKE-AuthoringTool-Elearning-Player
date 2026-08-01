/** Studio Games · Fill in the blanks (LP subtype fill_blanks). */

export type GamesFillBlank = {
  id: string;
  acceptable: string[];
};

export type GamesFillBlanksItem = {
  id: string;
  bodyText?: string;
  template: string;
  blanks: GamesFillBlank[];
  wordBank: string[];
  imageUrl?: string;
  imageFit?: "cover" | "contain";
};

export type GamesFillBlanksInteraction = {
  type: "games";
  format: "fill_blanks";
  quizGroupId: string;
  quizGroupTitle: string;
  bodyTextDefault: string;
  items: GamesFillBlanksItem[];
};

export type GamesFillBlanksAuthoringDocument = {
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
  interaction: GamesFillBlanksInteraction;
};

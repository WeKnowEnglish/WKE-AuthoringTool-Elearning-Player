/** Studio Games · True/false (LP subtype true_false). */

export type GamesTrueFalseItem = {
  id: string;
  statement: string;
  correct: boolean;
  pictureTruthStatement?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
};

export type GamesTrueFalseInteraction = {
  type: "games";
  format: "true_false";
  quizGroupId: string;
  quizGroupTitle: string;
  items: GamesTrueFalseItem[];
};

export type GamesTrueFalseAuthoringDocument = {
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
  interaction: GamesTrueFalseInteraction;
};

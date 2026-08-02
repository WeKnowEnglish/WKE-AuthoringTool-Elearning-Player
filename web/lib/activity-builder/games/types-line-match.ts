/** Studio Games · Line match (LP subtype line_match). */

export type GamesLineMatchToken = {
  id: string;
  label: string;
};

export type GamesLineMatchZone = {
  id: string;
  label?: string;
  imageUrl?: string;
};

export type GamesLineMatchScreen = {
  id: string;
  bodyText?: string;
  tokens: GamesLineMatchToken[];
  zones: GamesLineMatchZone[];
  /** tokenId → zoneId */
  correctMap: Record<string, string>;
};

export type GamesLineMatchInteraction = {
  type: "games";
  format: "line_match";
  quizGroupId: string;
  quizGroupTitle: string;
  bodyTextDefault: string;
  screens: GamesLineMatchScreen[];
};

export type GamesLineMatchAuthoringDocument = {
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
  interaction: GamesLineMatchInteraction;
};

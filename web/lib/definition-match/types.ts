/** Standalone definition match authoring document (Activity Bank + homework freeze). */

export type DefinitionMatchPair = {
  id: string;
  word: string;
  definition: string;
};

export type DefinitionMatchDocument = {
  version: 1;
  kind: "definition-match";
  id: string;
  title: string;
  instructions: string;
  pairs: DefinitionMatchPair[];
  shuffleWords: boolean;
  cefr?: string;
};

/** Playable slice for the dedicated student player. */
export type DefinitionMatchPlayable = {
  title: string;
  instructions: string;
  pairs: DefinitionMatchPair[];
  shuffleWords: boolean;
};

export const DEFINITION_MATCH_KIND = "definition-match" as const;
export const DEFAULT_DEFINITION_MATCH_INSTRUCTIONS =
  "Match each word to its meaning.";

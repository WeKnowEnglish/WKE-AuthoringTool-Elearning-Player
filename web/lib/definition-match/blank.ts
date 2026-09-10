import {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFAULT_DEFINITION_MATCH_TITLE,
  DEFINITION_MATCH_KIND,
  DEFINITION_MATCH_MIN_PAIRS,
  type DefinitionMatchDocument,
  type DefinitionMatchPair,
} from "@/lib/definition-match/types";

export function createBlankDefinitionMatchPair(): DefinitionMatchPair {
  return {
    id: crypto.randomUUID(),
    word: "",
    definition: "",
  };
}

/** Empty teacher-authored starter: the required number of word–definition pairs. */
export function createBlankDefinitionMatchDocument(): DefinitionMatchDocument {
  return {
    version: 1,
    kind: DEFINITION_MATCH_KIND,
    id: crypto.randomUUID(),
    title: DEFAULT_DEFINITION_MATCH_TITLE,
    instructions: DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
    shuffleWords: true,
    pairs: Array.from({ length: DEFINITION_MATCH_MIN_PAIRS }, () =>
      createBlankDefinitionMatchPair(),
    ),
  };
}

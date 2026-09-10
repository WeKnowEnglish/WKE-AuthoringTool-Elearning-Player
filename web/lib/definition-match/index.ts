export type {
  DefinitionMatchDocument,
  DefinitionMatchPair,
  DefinitionMatchPlayable,
} from "@/lib/definition-match/types";
export {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFAULT_DEFINITION_MATCH_TITLE,
  DEFINITION_MATCH_KIND,
  DEFINITION_MATCH_MAX_PAIRS,
  DEFINITION_MATCH_MIN_PAIRS,
} from "@/lib/definition-match/types";
export {
  definitionMatchStubPack,
  resolveDefinitionMatchFromBankPayload,
  toDefinitionMatchPlayable,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match/document";
export {
  isDefinitionMatchMastered,
  scoreDefinitionMatchAnswers,
  scoreDefinitionMatchPlayable,
  type DefinitionMatchScore,
} from "@/lib/definition-match/scoring";
export { compileDefinitionMatchFromVocabList } from "@/lib/definition-match/compile-from-vocab-list";
export { createSampleDefinitionMatchDocument } from "@/lib/definition-match/sample";
export {
  createBlankDefinitionMatchDocument,
  createBlankDefinitionMatchPair,
} from "@/lib/definition-match/blank";
export {
  asDefinitionMatchDraft,
  cloneDefinitionMatchDocumentForAuthoring,
} from "@/lib/definition-match/draft";

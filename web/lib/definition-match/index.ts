export type {
  DefinitionMatchDocument,
  DefinitionMatchPair,
  DefinitionMatchPlayable,
} from "@/lib/definition-match/types";
export {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFINITION_MATCH_KIND,
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

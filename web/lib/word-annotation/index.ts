export type {
  WordAnnotationDocument,
  WordAnnotationPlayable,
  WordAnnotationRole,
  WordAnnotationSentence,
  WordAnnotationToken,
} from "@/lib/word-annotation/types";
export {
  DEFAULT_WORD_ANNOTATION_INSTRUCTIONS,
  DEFAULT_WORD_ANNOTATION_REMEMBER,
  WORD_ANNOTATION_KIND,
  WORD_ANNOTATION_ROLES,
} from "@/lib/word-annotation/types";
export {
  resolveWordAnnotationFromBankPayload,
  toWordAnnotationPlayable,
  validateWordAnnotationDocument,
  wordAnnotationStubPack,
} from "@/lib/word-annotation/document";
export {
  countWordAnnotationTargets,
  isWordAnnotationMastered,
  scoreWordAnnotationAnswers,
  scoreWordAnnotationPlayable,
  type WordAnnotationScore,
} from "@/lib/word-annotation/scoring";
export { createSampleWordAnnotationDocument } from "@/lib/word-annotation/sample";

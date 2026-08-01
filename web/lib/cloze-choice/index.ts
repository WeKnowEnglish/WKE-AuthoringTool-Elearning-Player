export type {
  ClozeChoiceDocument,
  ClozeChoiceGapSegment,
  ClozeChoicePlayable,
  ClozeChoiceSegment,
  ClozeChoiceTextSegment,
} from "@/lib/cloze-choice/types";
export {
  CLOZE_CHOICE_KIND,
  DEFAULT_CLOZE_CHOICE_INSTRUCTIONS,
  listClozeChoiceGaps,
} from "@/lib/cloze-choice/types";
export {
  clozeChoiceStubPack,
  resolveClozeChoiceFromBankPayload,
  toClozeChoicePlayable,
  validateClozeChoiceDocument,
} from "@/lib/cloze-choice/document";
export {
  isClozeChoiceGapCorrect,
  isClozeChoiceMastered,
  scoreClozeChoiceAnswers,
  scoreClozeChoicePlayable,
  type ClozeChoiceScore,
} from "@/lib/cloze-choice/scoring";
export { createSampleClozeChoiceDocument } from "@/lib/cloze-choice/sample";

export type {
  ClozeOpenDocument,
  ClozeOpenGapSegment,
  ClozeOpenPlayable,
  ClozeOpenSegment,
  ClozeOpenTextSegment,
} from "@/lib/cloze-open/types";
export {
  CLOZE_OPEN_KIND,
  DEFAULT_CLOZE_OPEN_INSTRUCTIONS,
  listClozeOpenGaps,
} from "@/lib/cloze-open/types";
export {
  clozeOpenStubPack,
  resolveClozeOpenFromBankPayload,
  toClozeOpenPlayable,
  validateClozeOpenDocument,
} from "@/lib/cloze-open/document";
export {
  isClozeOpenMastered,
  isOpenClozeAnswerCorrect,
  normalizeOpenClozeAnswer,
  scoreClozeOpenAnswers,
  scoreClozeOpenPlayable,
  type ClozeOpenNormalizationOptions,
  type ClozeOpenScore,
} from "@/lib/cloze-open/scoring";
export { createSampleClozeOpenDocument } from "@/lib/cloze-open/sample";

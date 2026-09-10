export type {
  ReadAndAnswerDocument,
  ReadAndAnswerOption,
  ReadAndAnswerPassage,
  ReadAndAnswerPlayable,
  ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";
export {
  DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
  DEFAULT_READ_AND_ANSWER_TITLE,
  READ_AND_ANSWER_KIND,
  READ_AND_ANSWER_MAX_QUESTIONS,
  READ_AND_ANSWER_MIN_PASSAGE_CHARS,
  READ_AND_ANSWER_MIN_QUESTIONS,
} from "@/lib/read-and-answer/types";
export {
  readAndAnswerStubPack,
  resolveReadAndAnswerFromBankPayload,
  toReadAndAnswerPlayable,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer/document";
export {
  isReadAndAnswerMastered,
  isReadAndAnswerQuestionCorrect,
  scoreReadAndAnswerAnswers,
  scoreReadAndAnswerPlayable,
  type ReadAndAnswerScore,
} from "@/lib/read-and-answer/scoring";
export { createSampleReadAndAnswerDocument } from "@/lib/read-and-answer/sample";
export {
  createBlankReadAndAnswerDocument,
  createBlankReadAndAnswerQuestion,
} from "@/lib/read-and-answer/blank";
export {
  asReadAndAnswerDraft,
  cloneReadAndAnswerDocumentForAuthoring,
} from "@/lib/read-and-answer/draft";

export type {
  TeacherLexiconEntry,
  TeacherLexiconEntryKind,
  TeacherLexiconPos,
  TeacherLexiconPromotionStatus,
  TeacherLexiconStatus,
  UnifiedVocabSearchEntry,
  UnifiedVocabSearchFilters,
} from "./types";

export { isTeacherLexiconId, TEACHER_LEXICON_ID_PREFIX } from "./types";

export {
  canSubmitForCurriculum,
  canWithdrawCurriculumSubmission,
  promotionStatusLabel,
  teacherLexiconPromotionGaps,
  type PromotionMissingField,
} from "./promotion";

export {
  createTeacherLexiconId,
  inferEntryKind,
  normalizeLexiconSurface,
  slugHintFromSurface,
} from "./normalize";

export {
  isTeacherLexiconReadyForClass,
  teacherLexiconEnrichmentHints,
} from "./readiness";

export {
  collectUnifiedVocabFacets,
  mergeUnifiedVocabEntries,
  platformEntryToUnified,
  searchUnifiedVocab,
  teacherEntryToUnified,
} from "./unified-search";

export {
  mergeTeacherLexiconForPack,
  resolvePackLexemes,
  teacherIdsInPack,
  type PackLexemeResolution,
} from "./resolve-pack";

export {
  resolveSheetSurface,
  type SheetSurfaceResolve,
} from "./sheet-resolve";

export type TeacherLexiconEntryKind = "word" | "phrase" | "slang" | "name" | "other";

export type TeacherLexiconStatus = "teacher_draft" | "ready" | "archived";

/** Curriculum promotion queue (D5 light — no platform publish yet). */
export type TeacherLexiconPromotionStatus =
  | "none"
  | "pending"
  | "returned"
  | "approved"
  | "rejected";

export type TeacherLexiconPos =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "determiner"
  | "preposition"
  | "conjunction"
  | "number"
  | "interjection"
  | "modal"
  | "particle"
  | "unspecified";

export type TeacherLexiconEntry = {
  id: string;
  teacherId: string;
  surface: string;
  normalized: string;
  entryKind: TeacherLexiconEntryKind;
  pos: TeacherLexiconPos | null;
  primaryStage: string | null;
  primaryTopic: string | null;
  note: string | null;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
  status: TeacherLexiconStatus;
  promotionStatus: TeacherLexiconPromotionStatus;
  promotionSubmittedAt: string | null;
  promotionReviewedAt: string | null;
  promotionReviewNote: string | null;
  promotionReviewedBy: string | null;
  /** Set when approved into platform lexicon (`pv_*`). */
  promotedToId: string | null;
  promotedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

/** Shared search row for platform + teacher lexicon. */
export type UnifiedVocabSearchEntry = {
  id: string;
  lemma: string;
  normalizedLemma: string;
  pos: string;
  cefrBandCandidate: string;
  primaryStageCandidate: string;
  primaryTopic: string;
  topics: string[];
  vocabularyLane: string;
  status: string;
  reviewStatus: string;
  source: "platform" | "teacher";
  entryKind?: TeacherLexiconEntryKind;
  note?: string | null;
  definitionEn?: string | null;
  definitionVi?: string | null;
  readyForClass?: boolean;
  promotionStatus?: TeacherLexiconPromotionStatus;
};

export type UnifiedVocabSearchFilters = {
  query?: string;
  pos?: string | string[];
  primaryStageCandidate?: string | string[];
  primaryTopic?: string | string[];
  source?: "platform" | "teacher" | "all";
  entryKind?: TeacherLexiconEntryKind | TeacherLexiconEntryKind[];
  /** Teacher-only: filter by ready-for-class flag. */
  readyForClass?: "all" | "ready" | "draft";
};

export const TEACHER_LEXICON_ID_PREFIX = "tw_";

export function isTeacherLexiconId(id: string): boolean {
  return id.startsWith(TEACHER_LEXICON_ID_PREFIX);
}

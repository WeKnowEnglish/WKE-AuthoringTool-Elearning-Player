/**
 * Primary vocabulary candidate types (planning corpus v0.1).
 * Source of truth for content shape: content/vocabulary/reference/primary-candidates/
 *
 * Do not connect student mastery to these IDs until entries are reviewed
 * and legacy Primary set IDs are mapped.
 */

export type PartOfSpeech =
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
  | "particle";

export type PrimaryStage =
  | "PRE_A1_1"
  | "PRE_A1_2"
  | "A1_1"
  | "A1_2"
  | "A2_1"
  | "A2_2";

export type CefrBandCandidate = "PRE_A1" | "A1" | "A2";

export type VocabularyLane =
  | "general_english"
  | "academic_clil"
  | "digital_literacy"
  | "social_emotional"
  | "global_studies";

export type VocabularyCandidateStatus = "candidate" | "reviewed" | "published" | "deprecated";

export type VocabularyReviewStatus = "unreviewed" | "in_review" | "approved" | "rejected";

export type VocabularyCandidateEntry = {
  id: string;
  lemma: string;
  normalizedLemma: string;
  pos: PartOfSpeech;
  senseKey: "unspecified" | string;
  variants: string[];
  sourceCefr: "A1" | "A2";
  cefrBandCandidate: CefrBandCandidate;
  primaryStageCandidate: PrimaryStage;
  levelBasis: "cefrj_plus_primary_heuristic" | "primary_curriculum_decision";
  primaryTopic: string;
  topics: string[];
  sourceTopics: string[];
  vocabularyLane: VocabularyLane;
  acceptableTypedAnswers: string[];
  forms: Record<string, unknown>;
  grammar: Record<string, unknown>;
  learnerDefinitionEn: string | null;
  learnerMeaningVi: string | null;
  exampleSentence: string | null;
  mediaHint: string | null;
  sourceRefs: string[];
  status: VocabularyCandidateStatus;
  review: {
    status: VocabularyReviewStatus;
    needs: string[];
  };
};

export type PrimaryVocabularyCandidateDataset = {
  schemaVersion: 1;
  datasetVersion: string;
  title: string;
  scope: string;
  entryCount: number;
  publicationStatus: "planning_only_not_production";
  notes: string[];
  entries: VocabularyCandidateEntry[];
};

/** Slim row for teacher search / pack picker — keep payload small. */
export type PrimaryVocabularySearchIndexEntry = {
  id: string;
  lemma: string;
  normalizedLemma: string;
  pos: PartOfSpeech;
  cefrBandCandidate: CefrBandCandidate;
  primaryStageCandidate: PrimaryStage;
  primaryTopic: string;
  topics: string[];
  vocabularyLane: VocabularyLane;
  status: VocabularyCandidateStatus;
  reviewStatus: VocabularyReviewStatus;
};

export type PrimaryVocabularySearchIndex = {
  schemaVersion: 1;
  datasetVersion: string;
  sourceDataset: string;
  publicationStatus: "planning_only_not_production";
  entryCount: number;
  builtAt: string;
  entries: PrimaryVocabularySearchIndexEntry[];
};

export type PrimaryVocabularySearchFilters = {
  /** Case-insensitive match against lemma, normalizedLemma, or id. */
  query?: string;
  pos?: PartOfSpeech | PartOfSpeech[];
  primaryStageCandidate?: PrimaryStage | PrimaryStage[];
  cefrBandCandidate?: CefrBandCandidate | CefrBandCandidate[];
  primaryTopic?: string | string[];
  /** Match if any listed topic appears on the entry. */
  topics?: string | string[];
  vocabularyLane?: VocabularyLane | VocabularyLane[];
  status?: VocabularyCandidateStatus | VocabularyCandidateStatus[];
  reviewStatus?: VocabularyReviewStatus | VocabularyReviewStatus[];
};

export const PRIMARY_VOCABULARY_CANDIDATES_PATH =
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-candidates.v1.json";

export const PRIMARY_VOCABULARY_SEARCH_INDEX_PATH =
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json";

/**
 * Package-local type mirror. Prefer importing from
 * `@/lib/vocabulary/primary-candidates` in application code.
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

export type VocabularyLane =
  | "general_english"
  | "academic_clil"
  | "digital_literacy"
  | "social_emotional"
  | "global_studies";

export interface VocabularyCandidateEntry {
  id: string;
  lemma: string;
  normalizedLemma: string;
  pos: PartOfSpeech;

  /** Placeholder until a human confirms the lexical sense. */
  senseKey: "unspecified" | string;
  variants: string[];

  /** External source evidence; never overwrite during Primary review. */
  sourceCefr: "A1" | "A2";

  /** Project decisions requiring human review. */
  cefrBandCandidate: "PRE_A1" | "A1" | "A2";
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
  status: "candidate" | "reviewed" | "published" | "deprecated";
  review: {
    status: "unreviewed" | "in_review" | "approved" | "rejected";
    needs: string[];
  };
}

export interface PrimaryVocabularyCandidateDataset {
  schemaVersion: 1;
  datasetVersion: string;
  title: string;
  scope: string;
  entryCount: number;
  publicationStatus: "planning_only_not_production";
  notes: string[];
  entries: VocabularyCandidateEntry[];
}

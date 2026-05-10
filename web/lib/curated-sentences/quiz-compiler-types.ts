/**
 * Types for the A1 sentence-bank quiz compiler (CSV + master vocabulary).
 */

import type { Cefr, Difficulty, Pos, VocabularyEntry } from "./master-vocabulary";

/** Raw row shape matching `A1 Sentence Bank.csv` columns. */
export type SentenceBankCsvRow = {
  sentence: string;
  target_word: string;
  acceptable_targets: string;
  variant_lexemes: string;
  structure_id: string;
  tags: string;
  cefr: string;
  difficulty: string;
  /** Stable id shared by rows from the same `variant_lexemes` expansion (optional). */
  variant_group?: string;
};

/** Parsed + normalized row ready for indexing. */
export type NormalizedSentenceRow = {
  sentence: string;
  target_word: string;
  acceptable_targets: string[];
  variant_lexemes: string[];
  structure_id: string;
  tags: string[];
  cefr: Cefr | null;
  difficulty: Difficulty | null;
  variant_group: string;
  /** Original 0-based data row index (after header). */
  rowIndex: number;
};

/** Row linked to optional vocabulary entry. */
export type IndexedSentenceRow = NormalizedSentenceRow & {
  vocabulary: VocabularyEntry | null;
  /** Lowercased lookup key used for `vocabulary` (lemma / target). */
  lemmaKey: string;
};

export type QuizCompilerFilterTier =
  | "strict"
  | "tags_relaxed"
  | "difficulty_relaxed"
  | "topic_only"
  | "synthetic_vocab";

export type QuizCompilerDebug = {
  tier: QuizCompilerFilterTier;
  candidateCount: number;
  pickedRowIndices: number[];
  warnings: string[];
  quizQuestionCount?: QuizQuestionCount;
  quizDifficultyLevel?: QuizDifficultyLevel;
};

/** Student-selected quiz length (default 3 for legacy/tests). */
export type QuizQuestionCount = 3 | 6 | 10 | 15;

/** Student-selected difficulty — skews sampling toward vocab `difficulty` 1–3. */
export type QuizDifficultyLevel = 1 | 2 | 3;

export type QuizBuildOptions = {
  questionCount: QuizQuestionCount;
  difficultyLevel: QuizDifficultyLevel;
};

export const DEFAULT_QUIZ_BUILD_OPTIONS: QuizBuildOptions = {
  questionCount: 3,
  difficultyLevel: 2,
};

/**
 * Every `topics[]` slug from `master-vocabulary.ts` (run `node scripts/extract-vocab-topics.mjs` to refresh).
 */
export const VOCAB_TOPIC_IDS = [
  "abilities",
  "actions",
  "activities",
  "animals",
  "art",
  "body",
  "classroom_commands",
  "clothes",
  "communication",
  "drinks",
  "emotions",
  "entertainment",
  "family",
  "food",
  "furniture",
  "games",
  "health",
  "home",
  "jobs",
  "kitchen",
  "knowledge",
  "math",
  "money",
  "movement",
  "music",
  "nature",
  "objects",
  "people",
  "perception",
  "places",
  "play",
  "positions",
  "possession",
  "preferences",
  "questions",
  "routines",
  "school",
  "shopping",
  "social",
  "sound",
  "sports",
  "state",
  "time",
  "toys",
  "transport",
  "weather",
] as const;

export type VocabTopicId = (typeof VOCAB_TOPIC_IDS)[number];

/** Six student-facing quiz topics (see `core-topic-clusters.ts` for vocab + tag clusters). */
export const STUDENT_MENU_TOPIC_IDS = [
  "food",
  "school",
  "animals",
  "weather",
  "clothes",
  "actions",
] as const;

/** Test-start menu topics — same IDs as `TestStartTopicId` in teststartpage bank. */
export type QuizTopicId = (typeof STUDENT_MENU_TOPIC_IDS)[number];


/** Versioned, template-independent parts used by Graded Homework collections. */

export const HOMEWORK_COLLECTION_VERSION = 1 as const;

export const HOMEWORK_COLLECTION_PART_KINDS = [
  "multiple_choice",
  "letter_mixup",
  "line_match",
  "listen_and_choose",
  "sentence_scramble",
  "free_response",
] as const;

export type HomeworkCollectionPartKind =
  (typeof HOMEWORK_COLLECTION_PART_KINDS)[number];

export type HomeworkCollectionGradingMode = "automatic" | "teacher_review";

export type HomeworkCollectionPartBase = {
  schemaVersion: typeof HOMEWORK_COLLECTION_VERSION;
  id: string;
  kind: HomeworkCollectionPartKind;
  title: string;
  instructions: string;
  required: boolean;
};

export type HomeworkCollectionMultipleChoicePart = HomeworkCollectionPartBase & {
  kind: "multiple_choice";
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correctOptionId: string;
  }>;
};

export type HomeworkCollectionLetterMixupPart = HomeworkCollectionPartBase & {
  kind: "letter_mixup";
  items: Array<{
    id: string;
    prompt: string;
    targetWord: string;
    acceptedWords: string[];
    imageUrl?: string;
  }>;
};

export type HomeworkCollectionLineMatchPart = HomeworkCollectionPartBase & {
  kind: "line_match";
  pairs: Array<{
    id: string;
    left: string;
    right: string;
    imageUrl?: string;
  }>;
};

export type HomeworkCollectionListenAndChoosePart = HomeworkCollectionPartBase & {
  kind: "listen_and_choose";
  items: Array<{
    id: string;
    prompt: string;
    audioUrl?: string;
    speakText?: string;
    choices: Array<{ id: string; label: string; imageUrl?: string }>;
    correctChoiceId: string;
  }>;
};

export type HomeworkCollectionSentenceScramblePart = HomeworkCollectionPartBase & {
  kind: "sentence_scramble";
  items: Array<{
    id: string;
    promptMode?: "scramble_only" | "additional_prompt";
    prompt?: string;
    sentence: string;
  }>;
};

export type HomeworkCollectionFreeResponsePart = HomeworkCollectionPartBase & {
  kind: "free_response";
  prompts: Array<{
    id: string;
    prompt: string;
    minWords: number;
    maxPoints: number;
  }>;
};

export type HomeworkCollectionPart =
  | HomeworkCollectionMultipleChoicePart
  | HomeworkCollectionLetterMixupPart
  | HomeworkCollectionLineMatchPart
  | HomeworkCollectionListenAndChoosePart
  | HomeworkCollectionSentenceScramblePart
  | HomeworkCollectionFreeResponsePart;

export type HomeworkCollectionDocument = {
  version: typeof HOMEWORK_COLLECTION_VERSION;
  parts: HomeworkCollectionPart[];
};

export type HomeworkCollectionPartResponse = {
  partId: string;
  answers: Record<string, string>;
};

export type HomeworkCollectionScoredPart = {
  partId: string;
  kind: HomeworkCollectionPartKind;
  gradingMode: HomeworkCollectionGradingMode;
  answers: Record<string, string>;
  correct: number | null;
  maxScore: number;
  answered: number;
  itemCount: number;
};

export type HomeworkCollectionAttemptContent = {
  version: typeof HOMEWORK_COLLECTION_VERSION;
  parts: Record<string, HomeworkCollectionScoredPart>;
};

export type HomeworkCollectionAttempt = {
  id: string;
  homeworkId: string;
  studentId: string;
  status: "in_progress" | "submitted";
  content: HomeworkCollectionAttemptContent;
  autoScore: number;
  autoMaxScore: number;
  manualMaxScore: number;
  submittedAt: string | null;
  updatedAt: string;
};

export type HomeworkCollectionReviewPart = {
  score: number;
  maxScore: number;
  feedback: string;
};

export type HomeworkCollectionReview = {
  parts: Record<string, HomeworkCollectionReviewPart>;
  feedback: string;
  reviewedAt: string;
};

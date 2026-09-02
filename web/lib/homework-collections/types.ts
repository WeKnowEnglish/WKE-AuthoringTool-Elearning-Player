/** Versioned, template-independent parts used by Graded Homework collections. */

import type { HomeworkStudioFormat } from "@/lib/class-homework/types";
import type { QuizSession } from "@/lib/activity-builder/games/quiz-builder-session";
import type { CollectionReadingModuleFormat } from "@/lib/homework-collections/document-module";

export const HOMEWORK_COLLECTION_VERSION = 1 as const;

export const HOMEWORK_COLLECTION_PART_KINDS = [
  "multiple_choice",
  "letter_mixup",
  "line_match",
  "listen_and_choose",
  "listening_item_match",
  "sentence_scramble",
  "creative_presentation",
  "free_response",
  "speaking_prompt",
  "lesson_player_pack",
  "document_module",
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

/** One shared audio track, then match five prompts to eight choices (three distractors). */
export type HomeworkCollectionListeningItemMatchPart = HomeworkCollectionPartBase & {
  kind: "listening_item_match";
  activity: {
    audioText: string;
    audioUrl?: string;
    choices: Array<{ id: string; label: string; imageSrc?: string }>;
    prompts: Array<{ id: string; label: string; correctChoiceId: string }>;
  };
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

export type HomeworkCollectionCreativePresentationPart =
  HomeworkCollectionPartBase & {
    kind: "creative_presentation";
    templateId: "vlog-plan-v1";
    idea: {
      textId: string;
      mediaId: string;
      question: string;
      direction: string;
      starters: string[];
    };
    plan: {
      question: string;
      direction: string;
      fields: Array<{ id: string; label: string; starter: string }>;
    };
    story: {
      question: string;
      direction: string;
      frames: Array<{ id: string; label: string }>;
    };
    opening: {
      textId: string;
      question: string;
      direction: string;
      starters: string[];
    };
    maxPoints: number;
  };

/** Single spoken response recorded by the student (teacher review). */
export type HomeworkCollectionSpeakingPromptPart = HomeworkCollectionPartBase & {
  kind: "speaking_prompt";
  prompt: string;
  imageUrl?: string;
  responseId: string;
  maxDurationSeconds: number;
  maxPoints: number;
};

/** Frozen Lesson Player quiz pack (flashcards, true/false, word games, etc.). */
export type HomeworkCollectionLessonPlayerPackPart = HomeworkCollectionPartBase & {
  kind: "lesson_player_pack";
  studioFormat: HomeworkStudioFormat;
  pack: Record<string, unknown>;
  /** Round-trip quiz authoring for in-track editing. */
  authoringSession?: QuizSession;
};

/** Reading / document homework module (read and answer, cloze, etc.). */
export type HomeworkCollectionDocumentModulePart = HomeworkCollectionPartBase & {
  kind: "document_module";
  moduleFormat: CollectionReadingModuleFormat;
  document: Record<string, unknown>;
};

export type HomeworkCollectionPart =
  | HomeworkCollectionMultipleChoicePart
  | HomeworkCollectionLetterMixupPart
  | HomeworkCollectionLineMatchPart
  | HomeworkCollectionListenAndChoosePart
  | HomeworkCollectionListeningItemMatchPart
  | HomeworkCollectionSentenceScramblePart
  | HomeworkCollectionCreativePresentationPart
  | HomeworkCollectionFreeResponsePart
  | HomeworkCollectionSpeakingPromptPart
  | HomeworkCollectionLessonPlayerPackPart
  | HomeworkCollectionDocumentModulePart;

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

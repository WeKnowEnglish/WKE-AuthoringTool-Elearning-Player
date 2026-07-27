import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";
import type { WhiteboardMode } from "@/lib/whiteboard/domain";
import type { WordCardsParticipationMode } from "@/lib/word-cards/domain";

export const CLASS_LESSON_STATUSES = ["draft", "ready", "archived"] as const;
export type ClassLessonStatus = (typeof CLASS_LESSON_STATUSES)[number];

export const CLASS_LESSON_STEP_KINDS = [
  "whiteboard",
  "document",
  "word_cards",
  "live_game",
] as const;
export type ClassLessonStepKind = (typeof CLASS_LESSON_STEP_KINDS)[number];

export type WhiteboardLessonStepConfig = {
  title: string;
  instructions: string;
  timerMinutes: number;
  worksheetPresetId: string | null;
  mode: WhiteboardMode;
};

export type DocumentLessonStepConfig = {
  templateType: DocumentTemplateType;
  participationMode: DocumentParticipationMode;
  title: string;
  instructions: string;
  successCriteria: string;
  stimulus: string;
  wordBank: string[];
  sentenceStarters: string[];
  groupSubmitPolicy: "any_member";
  timerMinutes: number;
};

export type WordCardsLessonStepConfig = {
  title: string;
  instructions: string;
  successCriteria: string;
  wordList: string[];
  participationMode: WordCardsParticipationMode;
  timerMinutes: number;
};

export type LiveGameLessonStepConfig = {
  questionSetId: string;
  questionSetTitle: string;
  questionSetSlug?: string;
  level?: string;
};

export type ClassLessonStepConfigByKind = {
  whiteboard: WhiteboardLessonStepConfig;
  document: DocumentLessonStepConfig;
  word_cards: WordCardsLessonStepConfig;
  live_game: LiveGameLessonStepConfig;
};

export type ClassLessonStep = {
  id: string;
  position: number;
  kind: ClassLessonStepKind;
  title: string;
  config: ClassLessonStepConfigByKind[ClassLessonStepKind];
};

export type ClassLesson = {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  status: ClassLessonStatus;
  notes: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ClassLessonStep[];
};

export type ClassLessonSummary = {
  id: string;
  classId: string;
  title: string;
  status: ClassLessonStatus;
  notes: string;
  publishedAt: string | null;
  stepCount: number;
  updatedAt: string;
};

/** Student-safe projection of a published lesson (no teacher notes or step configs). */
export type StudentClassMaterialStep = {
  position: number;
  kind: ClassLessonStepKind;
  title: string;
};

export type StudentClassMaterial = {
  id: string;
  classId: string;
  title: string;
  publishedAt: string;
  steps: StudentClassMaterialStep[];
};

export type ClassLessonStepInput = {
  id?: string;
  kind: ClassLessonStepKind;
  title: string;
  config: unknown;
};

export type LiveGameQuestionSetOption = {
  id: string;
  slug: string;
  title: string;
  level: string;
  topic: string;
  questionCount: number;
};

export const CLASS_LESSON_STEP_KIND_LABELS: Record<ClassLessonStepKind, string> = {
  whiteboard: "Whiteboard",
  document: "Document",
  word_cards: "Word cards",
  live_game: "Live Game",
};

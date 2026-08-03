import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";
import type { WhiteboardMode } from "@/lib/whiteboard/domain";
import type { WordCardsParticipationMode } from "@/lib/word-cards/domain";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export const CLASS_LESSON_STATUSES = ["draft", "ready", "archived"] as const;
export type ClassLessonStatus = (typeof CLASS_LESSON_STATUSES)[number];

export const CLASS_LESSON_STEP_KINDS = [
  "custom",
  "whiteboard",
  "document",
  "word_cards",
  "live_game",
  "studio_activity",
] as const;
export type ClassLessonStepKind = (typeof CLASS_LESSON_STEP_KINDS)[number];

export const CLASS_LESSON_PHASES = [
  "warm_up",
  "review",
  "teach",
  "guided_practice",
  "independent_practice",
  "communicative_practice",
  "assessment",
  "reflection",
  "homework",
  "custom",
] as const;
export type ClassLessonPhase = (typeof CLASS_LESSON_PHASES)[number];

export type CustomLessonStepConfig = {
  materialNote: string;
};

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

export type StudioActivityLessonStepConfig = {
  activityId: string;
  activityTitle: string;
  format: StudioActivityFormat;
  playPath: string;
};

export type ClassLessonStepConfigByKind = {
  custom: CustomLessonStepConfig;
  whiteboard: WhiteboardLessonStepConfig;
  document: DocumentLessonStepConfig;
  word_cards: WordCardsLessonStepConfig;
  live_game: LiveGameLessonStepConfig;
  studio_activity: StudioActivityLessonStepConfig;
};

export type ClassLessonStep = {
  id: string;
  position: number;
  kind: ClassLessonStepKind;
  title: string;
  phase: ClassLessonPhase;
  durationMinutes: number;
  teacherAction: string;
  studentAction: string;
  config: ClassLessonStepConfigByKind[ClassLessonStepKind];
};

export type ClassLesson = {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  status: ClassLessonStatus;
  notes: string;
  objective: string;
  durationMinutes: number;
  targetLanguage: string;
  successCheck: string;
  templateKey: string | null;
  templateVersion: number | null;
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
  phase: ClassLessonPhase;
  durationMinutes: number;
  studentAction: string;
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
  phase?: ClassLessonPhase;
  durationMinutes?: number;
  teacherAction?: string;
  studentAction?: string;
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

export type StudioActivityOption = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  playPath: string;
};

export const CLASS_LESSON_STEP_KIND_LABELS: Record<ClassLessonStepKind, string> = {
  custom: "Teaching step",
  whiteboard: "Whiteboard",
  document: "Document",
  word_cards: "Word cards",
  live_game: "Live Game",
  studio_activity: "Activity Bank",
};

export const CLASS_LESSON_PHASE_LABELS: Record<ClassLessonPhase, string> = {
  warm_up: "Warm-up",
  review: "Review",
  teach: "Teach / model",
  guided_practice: "Guided practice",
  independent_practice: "Independent practice",
  communicative_practice: "Communicative practice",
  assessment: "Check learning",
  reflection: "Reflection",
  homework: "Homework / next step",
  custom: "Custom",
};

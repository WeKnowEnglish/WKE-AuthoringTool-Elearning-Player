import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";
import type {
  PackFlashcardCompiledCard,
  PackFlashcardFace,
  PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

export const CLASS_HOMEWORK_STATUSES = ["draft", "assigned", "closed"] as const;
export type ClassHomeworkStatus = (typeof CLASS_HOMEWORK_STATUSES)[number];

/** Bank formats assignable as frozen class homework (Phase 2). */
export const HOMEWORK_STUDIO_FORMATS = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
] as const;
export type HomeworkStudioFormat = (typeof HOMEWORK_STUDIO_FORMATS)[number];

export const CLASS_HOMEWORK_PAYLOAD_TYPES = [
  "pack_quiz",
  "pack_flashcards",
  "word_pack_practice",
  "external_note",
  "studio_activity",
  "homework_template",
] as const;
export type ClassHomeworkPayloadType = (typeof CLASS_HOMEWORK_PAYLOAD_TYPES)[number];

export type ClassHomeworkPayload =
  | {
      type: "pack_quiz";
      quizId: string;
      quizTitle: string;
      questionCount: number;
      /** Frozen compiled questions — preferred for student play. */
      questions?: PackQuizCompiledQuestion[];
      frozenAt?: string;
    }
  | {
      type: "pack_flashcards";
      setId: string;
      setTitle: string;
      cardCount: number;
      /** Frozen face snapshots — preferred for student play. */
      cards?: PackFlashcardCompiledCard[];
      /** Front/back config at freeze time. */
      options?: Pick<
        PackFlashcardOptions,
        "frontFaces" | "backFaces" | "includeFaces" | "shuffle"
      >;
      frozenAt?: string;
    }
  | {
      type: "word_pack_practice";
      packId: string;
      packTitle: string;
      wordCount: number;
    }
  | {
      type: "external_note";
      body: string;
    }
  | {
      type: "studio_activity";
      /** Provenance — Activity Bank row id at assign time. */
      activityId: string;
      format: HomeworkStudioFormat;
      title: string;
      screenCount: number;
      /** Frozen Lesson Player pack snapshot. */
      pack: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "homework_template";
      templateId: "homework-template-one";
      title: string;
      sectionCount: 6;
      frozenAt: string;
    };

export type ClassHomework = {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  status: ClassHomeworkStatus;
  payload: ClassHomeworkPayload;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentHomeworkCard = {
  id: string;
  classId: string;
  classTitle: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  status: "assigned" | "closed";
  payload: ClassHomeworkPayload;
  assignedAt: string | null;
  /** ISO timestamp when this student finished (quiz / flashcards), if any. */
  completedAt: string | null;
};

export type HomeworkCompletionSummary = {
  homeworkId: string;
  studentId: string;
  finishedAt: string;
  questionsTotal: number;
};

export const CLASS_HOMEWORK_PAYLOAD_LABELS: Record<ClassHomeworkPayloadType, string> = {
  pack_quiz: "Pack quiz",
  pack_flashcards: "Flashcards",
  word_pack_practice: "Word pack practice",
  external_note: "Note / reminder",
  studio_activity: "Activity Bank quiz",
  homework_template: "Homework template",
};

export function isHomeworkStudioFormat(
  value: unknown,
): value is HomeworkStudioFormat {
  return (
    typeof value === "string" &&
    (HOMEWORK_STUDIO_FORMATS as readonly string[]).includes(value)
  );
}

export function homeworkStudioFormatLabel(format: HomeworkStudioFormat): string {
  if (format === "multiple_choice") return "Multiple choice";
  if (format === "letter_mixup") return "Letter scramble";
  return "Flashcards";
}

/** Re-export face type for consumers that only import homework types. */
export type { PackFlashcardFace };

import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";
import type {
  PackFlashcardCompiledCard,
  PackFlashcardFace,
  PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";
import type { HomeworkTemplateId } from "@/lib/homework-templates/registry";

export const CLASS_HOMEWORK_STATUSES = ["draft", "assigned", "closed"] as const;
export type ClassHomeworkStatus = (typeof CLASS_HOMEWORK_STATUSES)[number];

/** Bank formats assignable as frozen class homework (Lesson Player packs). */
export const HOMEWORK_STUDIO_FORMATS = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
  "listen_and_choose",
  "line_match",
  "true_false",
  "sentence_scramble",
  "fill_blanks",
  "wordsearch",
  "crossword",
  "memory",
  "learning_track",
] as const;
export type HomeworkStudioFormat = (typeof HOMEWORK_STUDIO_FORMATS)[number];

export const CLASS_HOMEWORK_PAYLOAD_TYPES = [
  "pack_quiz",
  "pack_flashcards",
  "word_pack_practice",
  "external_note",
  "writing_prompt",
  "studio_activity",
  "homework_template",
  "graded_track",
  "picture_cloze",
  "verb_table",
  "sentence_columns",
  "word_annotation",
  "picture_writing",
  "question_writing",
  "definition_match",
  "cloze_choice",
  "cloze_open",
  "read_and_answer",
  "picture_story",
  "primary_a2_assessment",
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
      type: "writing_prompt";
      prompt: string;
      /** Optional extra guidance frozen at assign time. */
      instructions?: string;
      minWords?: number;
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
      templateId: HomeworkTemplateId;
      title: string;
      sectionCount: number;
      /** Assignment-owned template snapshot. Missing only on legacy rows. */
      document?: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      /** Track Builder Graded — full template clone frozen at assign time. */
      type: "graded_track";
      title: string;
      sectionCount: number;
      originTemplateId: HomeworkTemplateId;
      level: "primary" | "secondary";
      /** GradedTrackFreezeDocument snapshot. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "picture_cloze";
      /** Provenance — Activity Bank row id at assign time (empty for ad-hoc). */
      activityId: string;
      title: string;
      itemCount: number;
      /** Frozen picture cloze authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "verb_table";
      activityId: string;
      title: string;
      rowCount: number;
      /** Frozen verb table authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "sentence_columns";
      activityId: string;
      title: string;
      challengeCount: number;
      /** Frozen sentence columns authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "word_annotation";
      activityId: string;
      title: string;
      targetCount: number;
      /** Frozen word annotation authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "picture_writing";
      activityId: string;
      title: string;
      promptCount: number;
      /** Frozen picture writing authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "question_writing";
      activityId: string;
      title: string;
      promptCount: number;
      /** Frozen question writing authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "definition_match";
      activityId: string;
      title: string;
      pairCount: number;
      /** Frozen definition match authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "cloze_choice";
      activityId: string;
      title: string;
      gapCount: number;
      /** Frozen cloze-choice authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "cloze_open";
      activityId: string;
      title: string;
      gapCount: number;
      /** Frozen open-cloze authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "read_and_answer";
      activityId: string;
      title: string;
      questionCount: number;
      /** Frozen read-and-answer authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "picture_story";
      activityId: string;
      title: string;
      questionCount: number;
      frameCount: number;
      /** Frozen picture-story authoring document. */
      document: Record<string, unknown>;
      frozenAt: string;
    }
  | {
      type: "primary_a2_assessment";
      definitionId: "primary-a2-exit-pilot";
      contentVersion: string;
      title: string;
      itemCount: number;
      frozenAt: string;
      /**
       * Track Builder freeze: full AssessmentDefinition embedded at assign.
       * Absent = Class Hub pointer to the in-repo fixture.
       */
      document?: Record<string, unknown>;
      /** Provenance when assigned from an Assessment track. */
      trackId?: string;
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
  /** Null means every enrolled student; otherwise only these student ids. */
  targetStudentIds: string[] | null;
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
  writing_prompt: "Writing homework",
  studio_activity: "Activity Bank activity",
  homework_template: "Homework template",
  graded_track: "Graded track",
  picture_cloze: "Picture cloze",
  verb_table: "Verb table",
  sentence_columns: "Sentence columns",
  word_annotation: "Word annotation",
  picture_writing: "Picture writing",
  question_writing: "Question writing",
  definition_match: "Definition match",
  cloze_choice: "Cloze with choices",
  cloze_open: "Open cloze",
  read_and_answer: "Read and answer",
  picture_story: "Picture story",
  primary_a2_assessment: "Primary A2 assessment",
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
  if (format === "flashcards") return "Flashcards";
  if (format === "listen_and_choose") return "Listen and choose";
  if (format === "line_match") return "Line match";
  if (format === "true_false") return "True / false";
  if (format === "sentence_scramble") return "Sentence scramble";
  if (format === "fill_blanks") return "Fill in the blanks";
  if (format === "wordsearch") return "Word search";
  if (format === "crossword") return "Crossword";
  if (format === "memory") return "Memory";
  return "Learning track";
}

/** Re-export face type for consumers that only import homework types. */
export type { PackFlashcardFace };

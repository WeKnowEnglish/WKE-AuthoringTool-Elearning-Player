/** Track builder — Practice (LTC) vs Graded (homework freeze) vs Assessment (end summary). */

import type { AssessmentDefinition } from "@/lib/assessment/types";
import type { LearningTrackComposition } from "@/lib/learning-tracks/composition-types";
import type { HomeworkTemplateId } from "@/lib/homework-templates/registry";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import { seedPracticeComposition } from "@/lib/activity-tracks/seed-practice";

export const ACTIVITY_TRACK_DOCUMENT_VERSION = 1 as const;

export type ActivityTrackMode = "practice" | "graded" | "assessment";

export type ActivityTrackLevel = "primary" | "secondary" | "either";

export type ActivityTrackPartKind =
  | "multiple_choice"
  | "flashcards"
  | "fill_blanks"
  | "listen_and_choose"
  | "listening_item_match"
  | "line_match"
  | "true_false"
  | "sentence_scramble"
  | "letter_mixup"
  | "wordsearch"
  | "crossword"
  | "memory"
  | "read_and_answer"
  | "cloze_choice"
  | "cloze_open"
  | "definition_match"
  | "picture_story"
  | "explore_hotspots"
  | "picture_cloze"
  | "word_annotation"
  | "sentence_columns"
  | "verb_table"
  | "picture_writing"
  | "question_writing"
  | "writing_prompt"
  | "free_response"
  | "speaking_prompt"
  | "secondary_sequence"
  | "secondary_corrections"
  | "secondary_dialogue"
  | "secondary_questions";

export type ActivityTrackPartSource =
  | { type: "empty" }
  | {
      type: "homework_part";
      /** Template-independent, versioned content for a reusable homework collection. */
      part: HomeworkCollectionPart;
    }
  | {
      type: "template_section";
      sectionId: string;
      /** Cloned template section / secondary part body. */
      section: Record<string, unknown>;
    };

export type ActivityTrackPart = {
  id: string;
  order: number;
  kind: ActivityTrackPartKind;
  label: string;
  source: ActivityTrackPartSource;
};

export type ActivityTrackGradedOrigin = {
  templateId: HomeworkTemplateId;
  level: "primary" | "secondary";
  /** Blank collections keep a level-compatible template id for legacy routing. */
  preset?: "template" | "blank";
};

export type ActivityTrackAssessmentOrigin = {
  definitionId: string;
  contentVersion: string;
  /**
   * Which seeded paper was cloned.
   * `reading-writing` = Flyers-shaped R&W only (default for new tracks).
   * `full` = Listening + R&W + Speaking.
   */
  paper?: "full" | "reading-writing";
};

/** Saved when switching away from Graded so teachers can return without losing parts. */
export type ActivityTrackGradedArchive = {
  parts: ActivityTrackPart[];
  gradedOrigin: ActivityTrackGradedOrigin | null;
  instructions: string;
  estimatedMinutes: number | null;
  level: ActivityTrackLevel;
};

/** Round-trip snapshots when toggling Practice ↔ Graded ↔ Assessment. */
export type ActivityTrackModeArchive = {
  graded?: ActivityTrackGradedArchive;
  practice?: LearningTrackComposition | null;
};

export type ActivityTrackDocument = {
  version: typeof ACTIVITY_TRACK_DOCUMENT_VERSION;
  id: string;
  mode: ActivityTrackMode;
  title: string;
  /** Teacher-selected card image. Falls back to activity content only when unset. */
  coverImageUrl?: string | null;
  instructions: string;
  level: ActivityTrackLevel;
  estimatedMinutes: number | null;
  vocabListId: string | null;
  parts: ActivityTrackPart[];
  /** Practice mode: LTC composition (live preview + compile). */
  practiceComposition: LearningTrackComposition | null;
  /** Graded mode: which homework template was cloned. */
  gradedOrigin: ActivityTrackGradedOrigin | null;
  /** Assessment mode: cloned editable definition (Primary A2 / Flyers-shaped). */
  assessmentDefinition: AssessmentDefinition | null;
  /** Assessment mode: which fixture was cloned. */
  assessmentOrigin: ActivityTrackAssessmentOrigin | null;
  /** Preserved content from the last mode switch (Practice ↔ Graded). */
  modeArchive?: ActivityTrackModeArchive;
  /** IndexedDB Activity Library id after Save. */
  libraryId: string | null;
  /** My Activity Bank id after Publish. */
  bankActivityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityTrackPartCatalogEntry = {
  kind: ActivityTrackPartKind;
  label: string;
  description: string;
  /** When true, only Graded homework mode can add this part. */
  gradedOnly?: boolean;
};

export const ACTIVITY_TRACK_PART_CATALOG: ActivityTrackPartCatalogEntry[] = [
  {
    kind: "multiple_choice",
    label: "Multiple choice",
    description: "Pick the right answer from options.",
  },
  {
    kind: "flashcards",
    label: "Flashcards",
    description: "Flip cards to study words.",
  },
  {
    kind: "fill_blanks",
    label: "Fill blanks",
    description: "Choose the missing word.",
  },
  {
    kind: "listen_and_choose",
    label: "Listen and choose",
    description: "Hear a prompt, then pick a picture.",
  },
  {
    kind: "listening_item_match",
    label: "Listen and match",
    description: "One conversation track, then match prompts to choices.",
  },
  {
    kind: "line_match",
    label: "Line match",
    description: "Connect words to pictures.",
  },
  {
    kind: "true_false",
    label: "True / false",
    description: "Judge each statement.",
  },
  {
    kind: "sentence_scramble",
    label: "Sentence scramble",
    description: "Put words in order.",
  },
  {
    kind: "letter_mixup",
    label: "Letter mixup",
    description: "Rebuild the word.",
  },
  {
    kind: "wordsearch",
    label: "Word search",
    description: "Find words in a grid.",
  },
  {
    kind: "crossword",
    label: "Crossword",
    description: "Solve clues in a crossword grid.",
  },
  {
    kind: "memory",
    label: "Memory",
    description: "Match pairs from a memory grid.",
  },
  {
    kind: "read_and_answer",
    label: "Read and answer",
    description: "Read a passage, then answer questions.",
  },
  {
    kind: "cloze_choice",
    label: "Cloze with choices",
    description: "Fill gaps in a passage from options.",
  },
  {
    kind: "cloze_open",
    label: "Open cloze",
    description: "Type the missing words in a passage.",
  },
  {
    kind: "definition_match",
    label: "Definition match",
    description: "Match words to their definitions.",
  },
  {
    kind: "picture_story",
    label: "Picture story",
    description: "Read a picture sequence and answer questions.",
  },
  {
    kind: "explore_hotspots",
    label: "Explore hotspots",
    description: "Tap hotspots in a scene.",
  },
  {
    kind: "picture_cloze",
    label: "Picture cloze",
    description: "Complete sentences from pictures.",
    gradedOnly: true,
  },
  {
    kind: "word_annotation",
    label: "Word annotation",
    description: "Mark adjectives and adverbs in sentences.",
    gradedOnly: true,
  },
  {
    kind: "sentence_columns",
    label: "Sentence columns",
    description: "Build sentences in subject / action / extra columns.",
    gradedOnly: true,
  },
  {
    kind: "verb_table",
    label: "Verb table",
    description: "Fill verb forms in a table.",
    gradedOnly: true,
  },
  {
    kind: "picture_writing",
    label: "Picture writing",
    description: "Write from a picture prompt.",
    gradedOnly: true,
  },
  {
    kind: "question_writing",
    label: "Question writing",
    description: "Write questions for teacher review.",
    gradedOnly: true,
  },
  {
    kind: "writing_prompt",
    label: "Writing prompt",
    description: "Student writing for teacher review.",
    gradedOnly: true,
  },
  {
    kind: "free_response",
    label: "Free response",
    description: "Short or extended writing for teacher review.",
    gradedOnly: true,
  },
  {
    kind: "speaking_prompt",
    label: "Speaking prompt",
    description: "Student recording for teacher review.",
    gradedOnly: true,
  },
  {
    kind: "secondary_sequence",
    label: "Read and order",
    description: "Order events from a reading.",
    gradedOnly: true,
  },
  {
    kind: "secondary_corrections",
    label: "Past corrections",
    description: "Correct simple-past mistakes.",
    gradedOnly: true,
  },
  {
    kind: "secondary_dialogue",
    label: "Complete dialogue",
    description: "Fill past-tense dialogue blanks.",
    gradedOnly: true,
  },
  {
    kind: "secondary_questions",
    label: "Past questions",
    description: "Choose words to build past-tense questions.",
    gradedOnly: true,
  },
];

export const ACTIVITY_TRACK_MODE_COPY: Record<
  ActivityTrackMode,
  { title: string; blurb: string; previewHint: string }
> = {
  practice: {
    title: "Practice track",
    blurb: "Students practice in order. Light completion. Best for classwork and self-study.",
    previewHint: "Live Lesson Player preview from the Learning Track compiler.",
  },
  graded: {
    title: "Homework collection",
    blurb: "Combine auto-graded and teacher-reviewed activities, then freeze them on assign.",
    previewHint: "Build from a blank collection or preset and preview the student experience.",
  },
  assessment: {
    title: "Assessment",
    blurb:
      "Primary A2 Reading & Writing paper (Flyers-shaped). Free nav, results after submit. Listening/Speaking stay on the full fixture for later.",
    previewHint:
      "Live student preview from the cloned R&W definition — Assign freezes content for the class.",
  },
};

export function partLabelForKind(kind: ActivityTrackPartKind): string {
  return (
    ACTIVITY_TRACK_PART_CATALOG.find((entry) => entry.kind === kind)?.label ?? kind
  );
}

export function isPartKindAllowedForMode(
  kind: ActivityTrackPartKind,
  mode: ActivityTrackMode,
): boolean {
  if (mode === "assessment") return false;
  const entry = ACTIVITY_TRACK_PART_CATALOG.find((item) => item.kind === kind);
  if (!entry) return false;
  if (entry.gradedOnly && mode !== "graded") return false;
  return true;
}

export function createEmptyActivityTrack(input: {
  mode: ActivityTrackMode;
  title: string;
}): ActivityTrackDocument {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const title = input.title.trim() || "Untitled track";
  const practiceComposition =
    input.mode === "practice"
      ? seedPracticeComposition({ trackId: id, title })
      : null;
  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id,
    mode: input.mode,
    title,
    coverImageUrl: null,
    instructions: practiceComposition?.aim ?? "",
    level: "either",
    estimatedMinutes: practiceComposition?.durationTargetMin ?? null,
    vocabListId: practiceComposition?.vocabListId ?? null,
    parts: [],
    practiceComposition,
    gradedOrigin: null,
    assessmentDefinition: null,
    assessmentOrigin: null,
    libraryId: null,
    bankActivityId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyPart(
  kind: ActivityTrackPartKind,
  order: number,
): ActivityTrackPart {
  return {
    id: crypto.randomUUID(),
    order,
    kind,
    label: partLabelForKind(kind),
    source: { type: "empty" },
  };
}

export function renumberParts(parts: ActivityTrackPart[]): ActivityTrackPart[] {
  return parts.map((part, index) => ({ ...part, order: index + 1 }));
}

export function partHasTemplateContent(part: ActivityTrackPart): boolean {
  return part.source.type === "template_section";
}

export function partHasHomeworkContent(part: ActivityTrackPart): boolean {
  return part.source.type === "template_section" || part.source.type === "homework_part";
}

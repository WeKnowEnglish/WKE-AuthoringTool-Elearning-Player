import { isLearningTrackComposition } from "@/lib/learning-tracks/composition";
import { isHomeworkTemplateId } from "@/lib/homework-templates/registry";
import { parseAssessmentDefinition } from "@/lib/assessment/parse-definition";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  type ActivityTrackAssessmentOrigin,
  type ActivityTrackDocument,
  type ActivityTrackGradedOrigin,
  type ActivityTrackLevel,
  type ActivityTrackMode,
  type ActivityTrackPart,
  type ActivityTrackPartKind,
  type ActivityTrackPartSource,
} from "@/lib/activity-tracks/types";
import { seedPracticeComposition } from "@/lib/activity-tracks/seed-practice";
import { seedAssessmentFromTemplate } from "@/lib/activity-tracks/seed-assessment";
import { parseHomeworkCollectionPart } from "@/lib/homework-collections";

function isPartKind(value: unknown): value is ActivityTrackPartKind {
  return (
    typeof value === "string" &&
    [
      "multiple_choice",
      "flashcards",
      "fill_blanks",
      "listen_and_choose",
      "line_match",
      "true_false",
      "sentence_scramble",
      "letter_mixup",
      "explore_hotspots",
      "picture_cloze",
      "word_annotation",
      "sentence_columns",
      "verb_table",
      "picture_writing",
      "question_writing",
      "writing_prompt",
      "free_response",
      "speaking_prompt",
      "secondary_sequence",
      "secondary_corrections",
      "secondary_dialogue",
      "secondary_questions",
    ].includes(value)
  );
}

function parsePartSource(raw: unknown): ActivityTrackPartSource {
  if (!raw || typeof raw !== "object") return { type: "empty" };
  const row = raw as Record<string, unknown>;
  if (row.type === "homework_part") {
    const part = parseHomeworkCollectionPart(row.part);
    if (part) return { type: "homework_part", part };
  }
  if (
    row.type === "template_section" &&
    typeof row.sectionId === "string" &&
    row.section &&
    typeof row.section === "object" &&
    !Array.isArray(row.section)
  ) {
    return {
      type: "template_section",
      sectionId: row.sectionId,
      section: row.section as Record<string, unknown>,
    };
  }
  return { type: "empty" };
}

function parsePart(raw: unknown): ActivityTrackPart | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || !isPartKind(row.kind)) return null;
  if (typeof row.label !== "string") return null;
  const order = typeof row.order === "number" ? row.order : 0;
  return {
    id: row.id,
    order,
    kind: row.kind,
    label: row.label,
    source: parsePartSource(row.source),
  };
}

function parseGradedOrigin(raw: unknown): ActivityTrackGradedOrigin | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isHomeworkTemplateId(row.templateId)) return null;
  if (row.level !== "primary" && row.level !== "secondary") return null;
  return {
    templateId: row.templateId,
    level: row.level,
    ...(row.preset === "blank" ? { preset: "blank" as const } : {}),
  };
}

function parseAssessmentOrigin(raw: unknown): ActivityTrackAssessmentOrigin | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.definitionId !== "string" || !row.definitionId.trim()) return null;
  if (typeof row.contentVersion !== "string" || !row.contentVersion.trim()) return null;
  return {
    definitionId: row.definitionId.trim(),
    contentVersion: row.contentVersion.trim(),
  };
}

/** Validate and normalize a stored activity track draft document. */
export function parseActivityTrackDocument(raw: unknown): ActivityTrackDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== ACTIVITY_TRACK_DOCUMENT_VERSION) return null;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  if (row.mode !== "practice" && row.mode !== "graded" && row.mode !== "assessment") {
    return null;
  }
  const level: ActivityTrackLevel =
    row.level === "primary" || row.level === "secondary" || row.level === "either"
      ? row.level
      : "either";
  const parts = Array.isArray(row.parts)
    ? row.parts.map(parsePart).filter((part): part is ActivityTrackPart => Boolean(part))
    : [];
  const mode = row.mode as ActivityTrackMode;
  let practiceComposition = isLearningTrackComposition(row.practiceComposition)
    ? row.practiceComposition
    : null;
  if (mode === "practice" && !practiceComposition) {
    practiceComposition = seedPracticeComposition({
      trackId: row.id,
      title: row.title,
    });
  }

  let assessmentDefinition =
    mode === "assessment" ? parseAssessmentDefinition(row.assessmentDefinition) : null;
  let assessmentOrigin =
    mode === "assessment" ? parseAssessmentOrigin(row.assessmentOrigin) : null;
  if (mode === "assessment" && !assessmentDefinition) {
    const seeded = seedAssessmentFromTemplate({
      trackId: row.id,
      title: row.title,
    });
    assessmentDefinition = seeded.assessmentDefinition;
    assessmentOrigin = seeded.assessmentOrigin;
  }

  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id: row.id,
    mode,
    title: row.title,
    coverImageUrl: typeof row.coverImageUrl === "string" ? row.coverImageUrl.trim() || null : null,
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    level,
    estimatedMinutes:
      typeof row.estimatedMinutes === "number" ? row.estimatedMinutes : null,
    vocabListId: typeof row.vocabListId === "string" ? row.vocabListId : null,
    parts: mode === "assessment" ? [] : parts,
    practiceComposition: mode === "practice" ? practiceComposition : null,
    gradedOrigin: mode === "graded" ? parseGradedOrigin(row.gradedOrigin) : null,
    assessmentDefinition,
    assessmentOrigin,
    libraryId: typeof row.libraryId === "string" ? row.libraryId : null,
    bankActivityId: typeof row.bankActivityId === "string" ? row.bankActivityId : null,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
}

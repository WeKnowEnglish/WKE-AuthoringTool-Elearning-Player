import { isLearningTrackComposition } from "@/lib/learning-tracks/composition";
import { isHomeworkTemplateId } from "@/lib/homework-templates/registry";
import { parseAssessmentDefinition } from "@/lib/assessment/parse-definition";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  DEFAULT_ACTIVITY_TRACK_DESIGN,
  DEFAULT_ACTIVITY_TRACK_SUPPORT,
  type ActivityTrackAssessmentOrigin,
  type ActivityTrackDocument,
  type ActivityTrackGradedArchive,
  type ActivityTrackGradedOrigin,
  type ActivityTrackLevel,
  type ActivityTrackMode,
  type ActivityTrackModeArchive,
  type ActivityTrackPart,
  type ActivityTrackPartKind,
  type ActivityTrackPartSource,
  type ActivityTrackDesignSettings,
  type ActivityTrackSupportSettings,
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
      "listening_item_match",
      "line_match",
      "true_false",
      "sentence_scramble",
      "letter_mixup",
      "wordsearch",
      "crossword",
      "memory",
      "read_and_answer",
      "cloze_choice",
      "cloze_open",
      "definition_match",
      "picture_story",
      "explore_hotspots",
      "picture_cloze",
      "word_annotation",
      "sentence_columns",
      "verb_table",
      "picture_writing",
      "question_writing",
      "writing_prompt",
      "creative_presentation",
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

function parseGradedArchive(raw: unknown): ActivityTrackGradedArchive | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const parts = Array.isArray(row.parts)
    ? row.parts.map(parsePart).filter((part): part is ActivityTrackPart => Boolean(part))
    : [];
  const level: ActivityTrackLevel =
    row.level === "primary" || row.level === "secondary" || row.level === "either"
      ? row.level
      : "either";
  return {
    parts,
    gradedOrigin: parseGradedOrigin(row.gradedOrigin),
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    estimatedMinutes:
      typeof row.estimatedMinutes === "number" ? row.estimatedMinutes : null,
    level,
  };
}

function parseModeArchive(raw: unknown): ActivityTrackModeArchive | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const archive: ActivityTrackModeArchive = {};
  const graded = parseGradedArchive(row.graded);
  if (graded) archive.graded = graded;
  if (isLearningTrackComposition(row.practice)) {
    archive.practice = row.practice;
  } else if (row.practice === null) {
    archive.practice = null;
  }
  return Object.keys(archive).length > 0 ? archive : undefined;
}

function parseSupportSettings(raw: unknown): ActivityTrackSupportSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ACTIVITY_TRACK_SUPPORT };
  }
  const row = raw as Record<string, unknown>;
  return {
    learnerMessage:
      typeof row.learnerMessage === "string" ? row.learnerMessage : "",
    vocabularySupport:
      typeof row.vocabularySupport === "string" ? row.vocabularySupport : "",
    readDirectionsAloud: row.readDirectionsAloud === true,
  };
}

function parseDesignSettings(raw: unknown): ActivityTrackDesignSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_ACTIVITY_TRACK_DESIGN };
  }
  const row = raw as Record<string, unknown>;
  return {
    theme:
      row.theme === "navy" || row.theme === "warm" ? row.theme : "teal",
    contentWidth: row.contentWidth === "wide" ? "wide" : "focused",
    progressStyle: row.progressStyle === "numbers" ? "numbers" : "labels",
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
    topic: typeof row.topic === "string" ? row.topic : "",
    description: typeof row.description === "string" ? row.description : "",
    coverImageUrl: typeof row.coverImageUrl === "string" ? row.coverImageUrl.trim() || null : null,
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    support: parseSupportSettings(row.support),
    design: parseDesignSettings(row.design),
    level,
    estimatedMinutes:
      typeof row.estimatedMinutes === "number" ? row.estimatedMinutes : null,
    vocabListId: typeof row.vocabListId === "string" ? row.vocabListId : null,
    parts: mode === "assessment" ? [] : parts,
    practiceComposition: mode === "practice" ? practiceComposition : null,
    gradedOrigin: mode === "graded" ? parseGradedOrigin(row.gradedOrigin) : null,
    assessmentDefinition,
    assessmentOrigin,
    modeArchive: parseModeArchive(row.modeArchive),
    libraryId: typeof row.libraryId === "string" ? row.libraryId : null,
    bankActivityId: typeof row.bankActivityId === "string" ? row.bankActivityId : null,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
}

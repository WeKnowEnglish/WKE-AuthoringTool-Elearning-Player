import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  HOMEWORK_TEMPLATE_ONE,
  homeworkTemplateOneSchema,
  type HomeworkTemplateOne,
} from "@/lib/homework-templates/homework-template-one";
import {
  SECONDARY_HOMEWORK_ONE,
  SECONDARY_HOMEWORK_ONE_ID,
  parseSecondaryCorrectionsSection,
  parseSecondaryDialogueSection,
  parseSecondaryQuestionsSection,
  parseSecondarySequenceSection,
  parseSecondarySpeakingSection,
  secondaryCorrectionsSectionValidationIssues,
  secondaryDialogueSectionValidationIssues,
  secondaryQuestionsSectionValidationIssues,
  secondarySequenceSectionValidationIssues,
  secondarySpeakingSectionValidationIssues,
  type SecondaryHomeworkPartInstance,
  type SecondaryHomeworkTemplatePartId,
} from "@/lib/homework-templates/secondary-homework-one";
import { getHomeworkTemplateDefinition } from "@/lib/homework-templates/registry";
import {
  HOMEWORK_COLLECTION_VERSION,
  homeworkCollectionPartValidationIssues,
  parseHomeworkCollectionDocument,
  type HomeworkCollectionDocument,
} from "@/lib/homework-collections";
import {
  buildGradedTrackManifest,
  type GradedTrackManifest,
} from "@/lib/graded-activities";

export type GradedTrackFreezeDocument = {
  version: 1;
  trackId: string;
  title: string;
  instructions: string;
  level: "primary" | "secondary";
  originTemplateId: string;
  estimatedMinutes: number | null;
  parts: Array<{
    id: string;
    order: number;
    label: string;
    kind: string;
    sectionId: string;
  }>;
  primaryDocument?: HomeworkTemplateOne;
  secondaryDocument?: typeof SECONDARY_HOMEWORK_ONE;
  /** Ordered, uniquely identified Secondary activities, including repeated kinds. */
  secondaryParts?: SecondaryHomeworkPartInstance[];
  /** Template-independent activities added to the graded timeline. */
  collectionDocument?: HomeworkCollectionDocument;
  /** Shared, answer-free grading map for every frozen activity and item. */
  gradingManifest?: GradedTrackManifest;
};

function templateSectionsFromParts(doc: ActivityTrackDocument) {
  return doc.parts
    .filter((part) => part.source.type === "template_section")
    .slice()
    .sort((a, b) => a.order - b.order);
}

function homeworkContentParts(doc: ActivityTrackDocument) {
  return doc.parts
    .filter(
      (part) =>
        part.source.type === "template_section" || part.source.type === "homework_part",
    )
    .slice()
    .sort((a, b) => a.order - b.order);
}

function buildPrimaryDocument(doc: ActivityTrackDocument): HomeworkTemplateOne {
  const sections = templateSectionsFromParts(doc).map((part, index) => {
    if (part.source.type !== "template_section") {
      throw new Error("Expected template section.");
    }
    const section = structuredClone(part.source.section) as Record<string, unknown>;
    section.order = index + 1;
    if (typeof section.id !== "string" || !section.id.trim()) {
      section.id = part.id;
    }
    if (typeof section.title === "string") {
      section.title = part.label;
    }
    return section;
  });

  return homeworkTemplateOneSchema.parse({
    schemaVersion: 1,
    id: "homework-template-one",
    title: doc.title.trim() || HOMEWORK_TEMPLATE_ONE.title,
    subtitle:
      doc.instructions.trim() || HOMEWORK_TEMPLATE_ONE.subtitle,
    estimatedMinutes:
      typeof doc.estimatedMinutes === "number" && doc.estimatedMinutes > 0
        ? doc.estimatedMinutes
        : HOMEWORK_TEMPLATE_ONE.estimatedMinutes,
    sections,
  });
}

function buildSecondaryDocument(
  doc: ActivityTrackDocument,
): typeof SECONDARY_HOMEWORK_ONE {
  const base = structuredClone(SECONDARY_HOMEWORK_ONE) as {
    reading: Record<string, unknown>;
    corrections: Record<string, unknown>;
    dialogue: Record<string, unknown>;
    questions: Record<string, unknown>;
    speaking: Record<string, unknown>;
  };

  for (const part of templateSectionsFromParts(doc)) {
    if (part.source.type !== "template_section") continue;
    const section = parseSecondaryTemplateSection(
      part.kind,
      part.source.section,
      part.label,
    );
    const body = { ...section };
    delete body.partId;
    switch (secondaryTemplatePartId(part.kind)) {
      case "community-sequence":
        base.reading = { ...base.reading, ...body };
        if (typeof body.title !== "string") {
          base.reading.title = part.label;
        }
        break;
      case "past-corrections":
        base.corrections = { ...base.corrections, ...body };
        break;
      case "irregular-dialogue":
        base.dialogue = { ...base.dialogue, ...body };
        break;
      case "past-question-choice":
        base.questions = { ...base.questions, ...body };
        break;
      case "community-speaking":
        base.speaking = { ...base.speaking, ...body };
        break;
      default:
        break;
    }
  }

  return base as typeof SECONDARY_HOMEWORK_ONE;
}

function secondaryTemplatePartId(kind: string): SecondaryHomeworkTemplatePartId {
  switch (kind) {
    case "secondary_sequence":
      return "community-sequence";
    case "secondary_corrections":
      return "past-corrections";
    case "secondary_dialogue":
      return "irregular-dialogue";
    case "secondary_questions":
      return "past-question-choice";
    case "speaking_prompt":
      return "community-speaking";
    default:
      throw new Error(`Unsupported Secondary homework part kind: ${kind}`);
  }
}

function parseSecondaryTemplateSection(
  kind: string,
  raw: unknown,
  label: string,
): Record<string, unknown> {
  const result = (() => {
    switch (secondaryTemplatePartId(kind)) {
      case "community-sequence":
        return {
          content: parseSecondarySequenceSection(raw),
          issues: secondarySequenceSectionValidationIssues(raw),
        };
      case "past-corrections":
        return {
          content: parseSecondaryCorrectionsSection(raw),
          issues: secondaryCorrectionsSectionValidationIssues(raw),
        };
      case "irregular-dialogue":
        return {
          content: parseSecondaryDialogueSection(raw),
          issues: secondaryDialogueSectionValidationIssues(raw),
        };
      case "past-question-choice":
        return {
          content: parseSecondaryQuestionsSection(raw),
          issues: secondaryQuestionsSectionValidationIssues(raw),
        };
      case "community-speaking":
        return {
          content: parseSecondarySpeakingSection(raw),
          issues: secondarySpeakingSectionValidationIssues(raw),
        };
    }
  })();
  if (!result.content) {
    throw new Error(
      `Fix “${label}” before assigning: ${result.issues[0] ?? "the activity is incomplete."}`,
    );
  }
  return structuredClone(result.content) as unknown as Record<string, unknown>;
}

function buildSecondaryParts(
  doc: ActivityTrackDocument,
): SecondaryHomeworkPartInstance[] {
  return templateSectionsFromParts(doc).map((part, index) => {
    if (part.source.type !== "template_section") {
      throw new Error("Expected Secondary template section.");
    }
    const content = parseSecondaryTemplateSection(
      part.kind,
      part.source.section,
      part.label,
    );
    delete content.partId;
    return {
      id: part.id,
      templatePartId: secondaryTemplatePartId(part.kind),
      label: part.label,
      order: index + 1,
      content,
    } as SecondaryHomeworkPartInstance;
  });
}

export function buildGradedTrackFreezeDocument(
  doc: ActivityTrackDocument,
): GradedTrackFreezeDocument {
  if (doc.mode !== "graded" || !doc.gradedOrigin) {
    throw new Error("Only Graded tracks cloned from a template can be frozen.");
  }
  const parts = homeworkContentParts(doc);
  if (parts.length < 1) {
    throw new Error("Add at least one template part before assigning.");
  }

  const freeze: GradedTrackFreezeDocument = {
    version: 1,
    trackId: doc.id,
    title: doc.title.trim() || "Graded homework",
    instructions: doc.instructions.trim(),
    level: doc.gradedOrigin.level,
    originTemplateId: doc.gradedOrigin.templateId,
    estimatedMinutes: doc.estimatedMinutes,
    parts: parts.map((part) => ({
      id: part.id,
      order: part.order,
      label: part.label,
      kind: part.kind,
      sectionId:
        part.source.type === "template_section" ? part.source.sectionId : part.id,
    })),
    gradingManifest: buildGradedTrackManifest(doc),
  };

  const genericParts = parts.flatMap((part) =>
    part.source.type === "homework_part" ? [part.source.part] : [],
  );
  for (const part of genericParts) {
    const issues = homeworkCollectionPartValidationIssues(part);
    if (issues.length > 0) {
      throw new Error(
        `Fix “${part.title || "Homework activity"}” before assigning: ${issues[0]}`,
      );
    }
  }
  const collectionDocument = parseHomeworkCollectionDocument({
    version: HOMEWORK_COLLECTION_VERSION,
    parts: genericParts,
  });
  if (genericParts.length > 0 && collectionDocument?.parts.length !== genericParts.length) {
    throw new Error("Fix incomplete homework collection activities before assigning.");
  }
  if (collectionDocument) freeze.collectionDocument = collectionDocument;

  const hasTemplateParts = parts.some((part) => part.source.type === "template_section");
  if (doc.gradedOrigin.level === "primary" && hasTemplateParts) {
    freeze.primaryDocument = buildPrimaryDocument(doc);
  } else if (doc.gradedOrigin.level === "secondary" && hasTemplateParts) {
    freeze.secondaryDocument = buildSecondaryDocument(doc);
    freeze.secondaryParts = buildSecondaryParts(doc);
  }

  return freeze;
}

export function freezeGradedTrackHomeworkPayload(input: {
  document: ActivityTrackDocument;
}): Extract<ClassHomeworkPayload, { type: "graded_track" }> {
  const freezeDoc = buildGradedTrackFreezeDocument(input.document);
  const definition = getHomeworkTemplateDefinition(freezeDoc.originTemplateId);
  if (!definition) {
    throw new Error("Unknown template origin on graded track.");
  }
  if (
    freezeDoc.level === "primary" &&
    freezeDoc.originTemplateId !== "homework-template-one"
  ) {
    throw new Error("Primary graded tracks must clone Homework Template One.");
  }
  if (
    freezeDoc.level === "secondary" &&
    freezeDoc.originTemplateId !== SECONDARY_HOMEWORK_ONE_ID
  ) {
    throw new Error("Secondary graded tracks must clone Secondary Homework One.");
  }

  return {
    type: "graded_track",
    title: freezeDoc.title,
    sectionCount: freezeDoc.parts.length,
    originTemplateId: definition.id,
    level: freezeDoc.level,
    document: freezeDoc as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}

export function parseGradedTrackFreezeDocument(
  raw: unknown,
): GradedTrackFreezeDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) return null;
  if (typeof row.trackId !== "string" || typeof row.title !== "string") return null;
  if (row.level !== "primary" && row.level !== "secondary") return null;
  if (typeof row.originTemplateId !== "string") return null;
  if (!Array.isArray(row.parts) || row.parts.length < 1) return null;
  const freeze = raw as GradedTrackFreezeDocument;
  if (row.collectionDocument !== undefined) {
    const collectionDocument = parseHomeworkCollectionDocument(row.collectionDocument);
    if (!collectionDocument) return null;
    freeze.collectionDocument = collectionDocument;
  }
  if (row.gradingManifest !== undefined) {
    if (
      !row.gradingManifest ||
      typeof row.gradingManifest !== "object" ||
      Array.isArray(row.gradingManifest) ||
      (row.gradingManifest as Record<string, unknown>).version !== 1 ||
      (row.gradingManifest as Record<string, unknown>).trackId !== row.trackId ||
      !Array.isArray((row.gradingManifest as Record<string, unknown>).parts)
    ) {
      return null;
    }
  }
  if (row.secondaryParts !== undefined && !Array.isArray(row.secondaryParts)) {
    return null;
  }
  return freeze;
}

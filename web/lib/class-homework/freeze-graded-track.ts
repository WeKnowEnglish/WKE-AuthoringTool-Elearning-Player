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
} from "@/lib/homework-templates/secondary-homework-one";
import { getHomeworkTemplateDefinition } from "@/lib/homework-templates/registry";

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
};

function templateSectionsFromParts(doc: ActivityTrackDocument) {
  return doc.parts
    .filter((part) => part.source.type === "template_section")
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
    const section = structuredClone(part.source.section);
    const { partId: _partId, ...body } = section;
    switch (part.source.sectionId) {
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

export function buildGradedTrackFreezeDocument(
  doc: ActivityTrackDocument,
): GradedTrackFreezeDocument {
  if (doc.mode !== "graded" || !doc.gradedOrigin) {
    throw new Error("Only Graded tracks cloned from a template can be frozen.");
  }
  const parts = templateSectionsFromParts(doc);
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
  };

  if (doc.gradedOrigin.level === "primary") {
    freeze.primaryDocument = buildPrimaryDocument(doc);
  } else {
    freeze.secondaryDocument = buildSecondaryDocument(doc);
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
  return raw as GradedTrackFreezeDocument;
}

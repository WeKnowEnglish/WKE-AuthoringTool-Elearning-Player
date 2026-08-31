import {
  HOMEWORK_TEMPLATE_ONE,
  type HomeworkTemplateOne,
} from "@/lib/homework-templates/homework-template-one";
import {
  SECONDARY_HOMEWORK_ONE,
  SECONDARY_HOMEWORK_ONE_ID,
} from "@/lib/homework-templates/secondary-homework-one";
import {
  getHomeworkTemplateDefinition,
  type HomeworkTemplateId,
} from "@/lib/homework-templates/registry";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  ACTIVITY_TRACK_PART_CATALOG,
  DEFAULT_ACTIVITY_TRACK_DESIGN,
  DEFAULT_ACTIVITY_TRACK_SUPPORT,
  type ActivityTrackDocument,
  type ActivityTrackGradedOrigin,
  type ActivityTrackPart,
  type ActivityTrackPartKind,
} from "@/lib/activity-tracks/types";
import {
  GRADED_REUSABLE_PART_KINDS,
  isInlineHomeworkCollectionKind,
  isLpGradedPackKind,
  isReadingModuleKind,
} from "@/lib/activity-formats/registry";
import {
  createHomeworkCollectionPart,
} from "@/lib/homework-collections";
import { seedLessonPlayerPackFromTrackKind } from "@/lib/homework-collections/lesson-player-pack";
import { seedDocumentModuleFromTrackKind } from "@/lib/homework-collections/document-module";

export type GradedTemplateChoice = HomeworkTemplateId;

/** Start a template-independent graded collection while retaining level routing. */
export function seedBlankGradedCollection(input: {
  trackId: string;
  title: string;
  level: "primary" | "secondary";
}): ActivityTrackDocument {
  const now = new Date().toISOString();
  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id: input.trackId,
    mode: "graded",
    title: input.title.trim() || "Homework collection",
    topic: "",
    description: "",
    coverImageUrl: null,
    instructions: "Complete each activity, then submit your homework.",
    support: { ...DEFAULT_ACTIVITY_TRACK_SUPPORT },
    design: { ...DEFAULT_ACTIVITY_TRACK_DESIGN },
    level: input.level,
    estimatedMinutes: 20,
    vocabListId: null,
    parts: [],
    practiceComposition: null,
    libraryId: null,
    bankActivityId: null,
    gradedOrigin: {
      templateId:
        input.level === "primary"
          ? "homework-template-one"
          : "secondary-homework-template-one",
      level: input.level,
      preset: "blank",
    },
    assessmentDefinition: null,
    assessmentOrigin: null,
    createdAt: now,
    updatedAt: now,
  };
}

const PRIMARY_GRADED_KINDS = [
  "picture_cloze",
  "word_annotation",
  "sentence_columns",
  "verb_table",
  "picture_writing",
  "question_writing",
] as const satisfies readonly ActivityTrackPartKind[];

const SECONDARY_GRADED_KINDS = [
  "secondary_sequence",
  "secondary_corrections",
  "secondary_dialogue",
  "secondary_questions",
] as const satisfies readonly ActivityTrackPartKind[];

type SecondaryGradedKind = (typeof SECONDARY_GRADED_KINDS)[number];

const SECONDARY_KIND_TO_PART_ID: Record<
  SecondaryGradedKind | "speaking_prompt",
  string
> = {
  secondary_sequence: "community-sequence",
  secondary_corrections: "past-corrections",
  secondary_dialogue: "irregular-dialogue",
  secondary_questions: "past-question-choice",
  speaking_prompt: "community-speaking",
};

function primaryKindForSection(
  kind: HomeworkTemplateOne["sections"][number]["kind"],
): ActivityTrackPartKind {
  switch (kind) {
    case "picture_cloze":
      return "picture_cloze";
    case "word_annotation":
      return "word_annotation";
    case "sentence_columns":
      return "sentence_columns";
    case "verb_table":
      return "verb_table";
    case "picture_writing":
      return "picture_writing";
    case "question_writing":
      return "question_writing";
    default:
      return "picture_cloze";
  }
}

function secondaryKindForPartId(partId: string): ActivityTrackPartKind {
  switch (partId) {
    case "community-sequence":
      return "secondary_sequence";
    case "past-corrections":
      return "secondary_corrections";
    case "irregular-dialogue":
      return "secondary_dialogue";
    case "past-question-choice":
      return "secondary_questions";
    case "community-speaking":
      return "speaking_prompt";
    default:
      return "secondary_sequence";
  }
}

function clonePrimaryParts(): ActivityTrackPart[] {
  const doc = structuredClone(HOMEWORK_TEMPLATE_ONE);
  return doc.sections.map((section, index) => ({
    id: section.id,
    order: index + 1,
    kind: primaryKindForSection(section.kind),
    label: section.title,
    source: {
      type: "template_section" as const,
      sectionId: section.id,
      section: section as unknown as Record<string, unknown>,
    },
  }));
}

function cloneSecondaryParts(): ActivityTrackPart[] {
  const definition = getHomeworkTemplateDefinition(SECONDARY_HOMEWORK_ONE_ID)!;
  const content = structuredClone(SECONDARY_HOMEWORK_ONE);
  const byKey = {
    "community-sequence": content.reading,
    "past-corrections": content.corrections,
    "irregular-dialogue": content.dialogue,
    "past-question-choice": content.questions,
    "community-speaking": content.speaking,
  } as const;

  return definition.parts.map((part) => ({
    id: part.id,
    order: part.order,
    kind: secondaryKindForPartId(part.id),
    label: part.label,
    source: {
      type: "template_section" as const,
      sectionId: part.id,
      section: {
        partId: part.id,
        ...(byKey[part.id as keyof typeof byKey] as Record<string, unknown>),
      },
    },
  }));
}

/** Homework part kinds allowed on Graded Add for this origin level. */
export function gradedPartKindsForOrigin(
  origin: ActivityTrackGradedOrigin | null | undefined,
): readonly ActivityTrackPartKind[] {
  if (!origin) return [];
  const reusable = GRADED_REUSABLE_PART_KINDS;
  return origin.level === "primary"
    ? [...PRIMARY_GRADED_KINDS, ...reusable]
    : [...SECONDARY_GRADED_KINDS, ...reusable];
}

function primarySectionTemplate(
  kind: ActivityTrackPartKind,
): HomeworkTemplateOne["sections"][number] | null {
  const found = HOMEWORK_TEMPLATE_ONE.sections.find((section) => {
    switch (kind) {
      case "picture_cloze":
        return section.kind === "picture_cloze";
      case "word_annotation":
        return section.kind === "word_annotation";
      case "sentence_columns":
        return section.kind === "sentence_columns";
      case "verb_table":
        return section.kind === "verb_table";
      case "picture_writing":
        return section.kind === "picture_writing";
      case "question_writing":
        return section.kind === "question_writing";
      default:
        return false;
    }
  });
  return found ?? null;
}

/**
 * Seed a Graded timeline part with real template section content.
 * Every added part gets a fresh id so activity kinds can be reused independently.
 */
export function seedGradedPartFromKind(input: {
  kind: ActivityTrackPartKind;
  order: number;
  level: "primary" | "secondary";
  existingParts?: readonly ActivityTrackPart[];
}): ActivityTrackPart | null {
  if (input.kind === "writing_prompt") {
    const freePart = createHomeworkCollectionPart("free_response");
    if (freePart.kind !== "free_response") throw new Error("Expected free response part");
    const writingPart = {
      ...freePart,
      title: "Writing prompt",
      prompts: [
        {
          ...freePart.prompts[0]!,
          prompt: "Write your response to the prompt.",
          minWords: 10,
          maxPoints: 10,
        },
      ],
    };
    return {
      id: writingPart.id,
      order: input.order,
      kind: "writing_prompt",
      label: "Writing prompt",
      source: { type: "homework_part", part: writingPart },
    };
  }
  if (isLpGradedPackKind(input.kind)) {
    const part = seedLessonPlayerPackFromTrackKind(input.kind);
    return {
      id: part.id,
      order: input.order,
      kind: input.kind,
      label: part.title,
      source: { type: "homework_part", part },
    };
  }
  if (isReadingModuleKind(input.kind)) {
    const part = seedDocumentModuleFromTrackKind(input.kind);
    return {
      id: part.id,
      order: input.order,
      kind: input.kind,
      label: part.title,
      source: { type: "homework_part", part },
    };
  }
  if (isInlineHomeworkCollectionKind(input.kind)) {
    const part = createHomeworkCollectionPart(input.kind);
    return {
      id: part.id,
      order: input.order,
      kind: input.kind,
      label: part.title,
      source: { type: "homework_part", part },
    };
  }
  if (input.level === "primary") {
    if (!(PRIMARY_GRADED_KINDS as readonly ActivityTrackPartKind[]).includes(input.kind)) {
      return null;
    }
    const template = primarySectionTemplate(input.kind);
    if (!template) return null;
    const section = structuredClone(template) as Record<string, unknown>;
    const freshId = `${template.id}-${crypto.randomUUID().slice(0, 8)}`;
    section.id = freshId;
    section.order = input.order;
    return {
      id: freshId,
      order: input.order,
      kind: input.kind,
      label:
        typeof section.title === "string"
          ? section.title
          : ACTIVITY_TRACK_PART_CATALOG.find((entry) => entry.kind === input.kind)
              ?.label ?? input.kind,
      source: {
        type: "template_section",
        sectionId: freshId,
        section,
      },
    };
  }

  if (!(SECONDARY_GRADED_KINDS as readonly ActivityTrackPartKind[]).includes(input.kind)) {
    return null;
  }
  const partId = SECONDARY_KIND_TO_PART_ID[input.kind as SecondaryGradedKind];
  const definition = getHomeworkTemplateDefinition(SECONDARY_HOMEWORK_ONE_ID)!;
  const registryPart = definition.parts.find((part) => part.id === partId);
  if (!registryPart) return null;
  const content = structuredClone(SECONDARY_HOMEWORK_ONE);
  const byKey = {
    "community-sequence": content.reading,
    "past-corrections": content.corrections,
    "irregular-dialogue": content.dialogue,
    "past-question-choice": content.questions,
    "community-speaking": content.speaking,
  } as const;
  const body = byKey[partId as keyof typeof byKey];
  if (!body) return null;
  const freshId = `${partId}-${crypto.randomUUID().slice(0, 8)}`;

  return {
    id: freshId,
    order: input.order,
    kind: input.kind,
    label: registryPart.label,
    source: {
      type: "template_section",
      sectionId: freshId,
      section: {
        partId: freshId,
        ...(body as Record<string, unknown>),
      },
    },
  };
}

/** Clone a Primary/Secondary homework template into a Graded track draft. */
export function seedGradedFromTemplate(input: {
  trackId: string;
  title: string;
  templateId: GradedTemplateChoice;
}): ActivityTrackDocument {
  const definition = getHomeworkTemplateDefinition(input.templateId);
  if (!definition) {
    throw new Error(`Unknown homework template "${input.templateId}".`);
  }
  const now = new Date().toISOString();
  const title = input.title.trim() || definition.title;
  const parts =
    definition.level === "primary" ? clonePrimaryParts() : cloneSecondaryParts();

  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id: input.trackId,
    mode: "graded",
    title,
    topic: "",
    description: "",
    coverImageUrl: null,
    instructions: definition.subtitle,
    support: { ...DEFAULT_ACTIVITY_TRACK_SUPPORT },
    design: { ...DEFAULT_ACTIVITY_TRACK_DESIGN },
    level: definition.level,
    estimatedMinutes: definition.estimatedMinutes,
    vocabListId: null,
    parts,
    practiceComposition: null,
    libraryId: null,
    bankActivityId: null,
    gradedOrigin: {
      templateId: definition.id,
      level: definition.level,
      preset: "template",
    },
    assessmentDefinition: null,
    assessmentOrigin: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Re-clone template sections into an existing graded draft (keeps track id/title). */
export function resetGradedPartsFromOrigin(
  doc: ActivityTrackDocument,
): ActivityTrackDocument {
  if (!doc.gradedOrigin) return doc;
  if (doc.gradedOrigin.preset === "blank") {
    return { ...doc, parts: [] };
  }
  const seeded = seedGradedFromTemplate({
    trackId: doc.id,
    title: doc.title,
    templateId: doc.gradedOrigin.templateId,
  });
  return {
    ...doc,
    instructions: seeded.instructions,
    level: seeded.level,
    estimatedMinutes: seeded.estimatedMinutes,
    parts: seeded.parts,
    gradedOrigin: seeded.gradedOrigin,
  };
}

export function summarizeTemplateSection(
  section: Record<string, unknown> | undefined,
): string {
  if (!section) return "No content";
  if (typeof section.instructions === "string" && section.instructions.trim()) {
    const text = section.instructions.trim();
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }
  if (Array.isArray(section.items)) {
    return `${section.items.length} item${section.items.length === 1 ? "" : "s"}`;
  }
  if (Array.isArray(section.questions)) {
    return `${section.questions.length} question${section.questions.length === 1 ? "" : "s"}`;
  }
  if (Array.isArray(section.events)) {
    return `${section.events.length} events to order`;
  }
  if (Array.isArray(section.lines)) {
    return `${section.lines.length} dialogue lines`;
  }
  if (Array.isArray(section.sentences)) {
    return `${section.sentences.length} sentence${section.sentences.length === 1 ? "" : "s"}`;
  }
  if (Array.isArray(section.rows)) {
    return `${section.rows.length} verb row${section.rows.length === 1 ? "" : "s"}`;
  }
  if (typeof section.title === "string") return section.title;
  return "Template section";
}

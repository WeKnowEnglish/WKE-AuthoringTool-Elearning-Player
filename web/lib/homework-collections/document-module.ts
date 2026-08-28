import type { DocumentHomeworkStudioFormat } from "@/lib/class-homework/assignable-studio-formats";
import {
  isDocumentHomeworkStudioFormat,
  type DocumentHomeworkStudioFormat as DocFormat,
} from "@/lib/class-homework/assignable-studio-formats";
import {
  type ReadingModuleKind,
} from "@/lib/activity-formats/registry";
import {
  listClozeChoiceGaps,
  scoreClozeChoiceAnswers,
  validateClozeChoiceDocument,
  createSampleClozeChoiceDocument,
} from "@/lib/cloze-choice";
import {
  listClozeOpenGaps,
  scoreClozeOpenAnswers,
  validateClozeOpenDocument,
  createSampleClozeOpenDocument,
} from "@/lib/cloze-open";
import {
  scoreDefinitionMatchAnswers,
  validateDefinitionMatchDocument,
  createSampleDefinitionMatchDocument,
} from "@/lib/definition-match";
import {
  scorePictureStoryAnswers,
  validatePictureStoryDocument,
  createSamplePictureStoryDocument,
} from "@/lib/picture-story";
import {
  scoreReadAndAnswerAnswers,
  validateReadAndAnswerDocument,
  createSampleReadAndAnswerDocument,
} from "@/lib/read-and-answer";
import {
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionDocumentModulePart,
} from "@/lib/homework-collections/types";

export const COLLECTION_READING_MODULE_FORMATS = [
  "read_and_answer",
  "cloze_choice",
  "cloze_open",
  "definition_match",
  "picture_story",
] as const satisfies readonly DocumentHomeworkStudioFormat[];

export type CollectionReadingModuleFormat =
  (typeof COLLECTION_READING_MODULE_FORMATS)[number];

function isReadingModuleFormat(
  value: unknown,
): value is CollectionReadingModuleFormat {
  return (
    typeof value === "string" &&
    (COLLECTION_READING_MODULE_FORMATS as readonly string[]).includes(value)
  );
}

export function readingModuleKindToFormat(
  kind: ReadingModuleKind,
): CollectionReadingModuleFormat {
  return kind;
}

function cloneWithFreshIds<T extends { id: string }>(document: T): T {
  const clone = structuredClone(document);
  clone.id = crypto.randomUUID();
  return clone;
}

export function blankDocumentForModuleFormat(
  format: CollectionReadingModuleFormat,
): Record<string, unknown> {
  switch (format) {
    case "read_and_answer":
      return cloneWithFreshIds(createSampleReadAndAnswerDocument()) as unknown as Record<
        string,
        unknown
      >;
    case "cloze_choice":
      return cloneWithFreshIds(createSampleClozeChoiceDocument()) as unknown as Record<
        string,
        unknown
      >;
    case "cloze_open":
      return cloneWithFreshIds(createSampleClozeOpenDocument()) as unknown as Record<
        string,
        unknown
      >;
    case "definition_match":
      return cloneWithFreshIds(createSampleDefinitionMatchDocument()) as unknown as Record<
        string,
        unknown
      >;
    case "picture_story":
      return cloneWithFreshIds(createSamplePictureStoryDocument()) as unknown as Record<
        string,
        unknown
      >;
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unsupported reading module format: ${_exhaustive}`);
    }
  }
}

export function createDocumentModuleCollectionPart(
  format: CollectionReadingModuleFormat,
  id = crypto.randomUUID(),
): HomeworkCollectionDocumentModulePart {
  const document = blankDocumentForModuleFormat(format);
  const title =
    typeof document.title === "string" && document.title.trim()
      ? document.title.trim()
      : format.replace(/_/g, " ");
  return {
    schemaVersion: HOMEWORK_COLLECTION_VERSION,
    id,
    kind: "document_module",
    title,
    instructions:
      typeof document.instructions === "string" ? document.instructions.trim() : "",
    required: true,
    moduleFormat: format,
    document,
  };
}

export function seedDocumentModuleFromTrackKind(
  kind: ReadingModuleKind,
  id = crypto.randomUUID(),
): HomeworkCollectionDocumentModulePart {
  return createDocumentModuleCollectionPart(readingModuleKindToFormat(kind), id);
}

export function documentModuleItemIds(
  part: HomeworkCollectionDocumentModulePart,
): string[] {
  try {
    switch (part.moduleFormat) {
      case "read_and_answer": {
        const doc = validateReadAndAnswerDocument(part.document);
        return doc.questions.map((question) => question.id);
      }
      case "cloze_choice": {
        const doc = validateClozeChoiceDocument(part.document);
        return listClozeChoiceGaps(doc.segments).map((gap) => gap.id);
      }
      case "cloze_open": {
        const doc = validateClozeOpenDocument(part.document);
        return listClozeOpenGaps(doc.segments).map((gap) => gap.id);
      }
      case "definition_match": {
        const doc = validateDefinitionMatchDocument(part.document);
        return doc.pairs.map((pair) => pair.id);
      }
      case "picture_story": {
        const doc = validatePictureStoryDocument(part.document);
        return doc.questions.map((question) => question.id);
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export function documentModuleValidationIssues(
  part: HomeworkCollectionDocumentModulePart,
): string[] {
  if (!isReadingModuleFormat(part.moduleFormat)) {
    return ["Choose a supported reading activity format."];
  }
  try {
    switch (part.moduleFormat) {
      case "read_and_answer":
        validateReadAndAnswerDocument(part.document);
        return [];
      case "cloze_choice":
        validateClozeChoiceDocument(part.document);
        return [];
      case "cloze_open":
        validateClozeOpenDocument(part.document);
        return [];
      case "definition_match":
        validateDefinitionMatchDocument(part.document);
        return [];
      case "picture_story":
        validatePictureStoryDocument(part.document);
        return [];
      default:
        return ["Unsupported reading module format."];
    }
  } catch (error) {
    return [
      error instanceof Error ? error.message : "Reading activity failed validation.",
    ];
  }
}

export function scoreDocumentModuleAnswers(
  part: HomeworkCollectionDocumentModulePart,
  answers: Record<string, string>,
): number {
  switch (part.moduleFormat) {
    case "read_and_answer": {
      const doc = validateReadAndAnswerDocument(part.document);
      return scoreReadAndAnswerAnswers(doc.questions, answers).correct;
    }
    case "cloze_choice": {
      const doc = validateClozeChoiceDocument(part.document);
      return scoreClozeChoiceAnswers(doc.segments, answers).correct;
    }
    case "cloze_open": {
      const doc = validateClozeOpenDocument(part.document);
      return scoreClozeOpenAnswers(doc.segments, answers, {
        caseSensitive: doc.caseSensitive,
        punctuationSensitive: doc.punctuationSensitive,
      }).correct;
    }
    case "definition_match": {
      const doc = validateDefinitionMatchDocument(part.document);
      return scoreDefinitionMatchAnswers(doc.pairs, answers).correct;
    }
    case "picture_story": {
      const doc = validatePictureStoryDocument(part.document);
      return scorePictureStoryAnswers(doc.questions, answers).correct;
    }
    default:
      return 0;
  }
}

export function documentModuleFormatLabel(format: DocFormat): string {
  if (format === "read_and_answer") return "Read and answer";
  if (format === "cloze_choice") return "Cloze with choices";
  if (format === "cloze_open") return "Open cloze";
  if (format === "definition_match") return "Definition match";
  if (format === "picture_story") return "Picture story";
  return format;
}

export function isCollectionReadingModuleFormat(
  value: unknown,
): value is CollectionReadingModuleFormat {
  return isDocumentHomeworkStudioFormat(value) && isReadingModuleFormat(value);
}

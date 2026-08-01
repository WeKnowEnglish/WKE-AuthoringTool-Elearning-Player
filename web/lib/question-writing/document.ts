import type {
  QuestionWritingDocument,
  QuestionWritingPlayable,
  QuestionWritingPrompt,
  QuestionWritingWorkedExample,
} from "@/lib/question-writing/types";
import {
  DEFAULT_QUESTION_WRITING_INSTRUCTIONS,
  QUESTION_WRITING_KIND,
} from "@/lib/question-writing/types";

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function assertStringList(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  const words = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  if (words.length < min || words.length > max) {
    throw new Error(`${label} needs ${min}–${max} items.`);
  }
  return words;
}

function parseWorkedExample(raw: unknown): QuestionWritingWorkedExample {
  const example = assertRecord(raw, "workedExample");
  return {
    prompt: assertString(example.prompt, "workedExample.prompt"),
    question: assertString(example.question, "workedExample.question"),
    answer: assertString(example.answer, "workedExample.answer"),
  };
}

function parsePrompt(raw: unknown, index: number): QuestionWritingPrompt {
  const prompt = assertRecord(raw, `prompts[${index}]`);
  const minWordsRaw = prompt.minWords;
  if (
    typeof minWordsRaw !== "number" ||
    !Number.isInteger(minWordsRaw) ||
    minWordsRaw < 3 ||
    minWordsRaw > 15
  ) {
    throw new Error(`prompts[${index}].minWords must be an integer from 3–15.`);
  }
  return {
    id: assertString(prompt.id, `prompts[${index}].id`),
    promptWords: assertStringList(
      prompt.promptWords,
      `prompts[${index}].promptWords`,
      2,
      8,
    ),
    requiredWords: assertStringList(
      prompt.requiredWords,
      `prompts[${index}].requiredWords`,
      2,
      8,
    ),
    questionWord: assertString(
      prompt.questionWord,
      `prompts[${index}].questionWord`,
    ),
    helpingVerbs: assertStringList(
      prompt.helpingVerbs,
      `prompts[${index}].helpingVerbs`,
      1,
      6,
    ),
    minWords: minWordsRaw,
    modelQuestion: assertString(
      prompt.modelQuestion,
      `prompts[${index}].modelQuestion`,
    ),
  };
}

/** Validate a question writing authoring document (flexible prompt count ≥ 1). */
export function validateQuestionWritingDocument(
  raw: unknown,
): QuestionWritingDocument {
  const doc = assertRecord(raw, "question writing document");
  if (doc.version !== 1) {
    throw new Error("question writing document.version must be 1.");
  }
  if (doc.kind !== QUESTION_WRITING_KIND) {
    throw new Error(
      `question writing document.kind must be "${QUESTION_WRITING_KIND}".`,
    );
  }
  if (!Array.isArray(doc.prompts) || doc.prompts.length < 1) {
    throw new Error("prompts needs at least one prompt.");
  }
  if (doc.prompts.length > 8) {
    throw new Error("prompts supports at most 8 prompts.");
  }

  const prompts = doc.prompts.map((prompt, index) => parsePrompt(prompt, index));
  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: QUESTION_WRITING_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_QUESTION_WRITING_INSTRUCTIONS,
    workedExample: parseWorkedExample(doc.workedExample),
    prompts,
    ...(cefr ? { cefr } : {}),
  };
}

export function toQuestionWritingPlayable(
  document: QuestionWritingDocument,
): QuestionWritingPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    workedExample: { ...document.workedExample },
    prompts: document.prompts.map((prompt) => ({
      ...prompt,
      promptWords: [...prompt.promptWords],
      requiredWords: [...prompt.requiredWords],
      helpingVerbs: [...prompt.helpingVerbs],
    })),
  };
}

export function questionWritingStubPack(
  document: QuestionWritingDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "question-writing-pack",
    id: document.id,
    title: document.title,
    prompt_count: document.prompts.length,
    document,
  };
}

export function resolveQuestionWritingFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): QuestionWritingDocument {
  if (input.authoring) {
    try {
      return validateQuestionWritingDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "question writing pack");
  if (pack.document) {
    return validateQuestionWritingDocument(pack.document);
  }
  return validateQuestionWritingDocument(pack);
}

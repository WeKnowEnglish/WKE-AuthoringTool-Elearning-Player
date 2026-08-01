import type {
  ReadAndAnswerDocument,
  ReadAndAnswerOption,
  ReadAndAnswerPassage,
  ReadAndAnswerPlayable,
  ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";
import {
  DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
  READ_AND_ANSWER_KIND,
} from "@/lib/read-and-answer/types";

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

function parseOption(raw: unknown, questionIndex: number, optionIndex: number): ReadAndAnswerOption {
  const option = assertRecord(raw, `questions[${questionIndex}].options[${optionIndex}]`);
  return {
    id: assertString(option.id, `questions[${questionIndex}].options[${optionIndex}].id`),
    text: assertString(option.text, `questions[${questionIndex}].options[${optionIndex}].text`),
  };
}

function parseQuestion(raw: unknown, index: number): ReadAndAnswerQuestion {
  const question = assertRecord(raw, `questions[${index}]`);
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`questions[${index}].options needs at least 2 choices.`);
  }
  if (question.options.length > 4) {
    throw new Error(`questions[${index}].options supports at most 4 choices.`);
  }
  const options = question.options.map((option, optionIndex) =>
    parseOption(option, index, optionIndex),
  );
  const normalized = options.map((option) => option.text.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`questions[${index}].options must be unique.`);
  }
  const correctOptionId = assertString(
    question.correctOptionId,
    `questions[${index}].correctOptionId`,
  );
  if (!options.some((option) => option.id === correctOptionId)) {
    throw new Error(`questions[${index}].correctOptionId must be one of the options.`);
  }
  return {
    id: assertString(question.id, `questions[${index}].id`),
    prompt: assertString(question.prompt, `questions[${index}].prompt`),
    options,
    correctOptionId,
  };
}

function parsePassage(raw: unknown): ReadAndAnswerPassage {
  const passage = assertRecord(raw, "passage");
  const text = assertString(passage.text, "passage.text");
  if (text.length < 40) {
    throw new Error("passage.text must be at least 40 characters.");
  }
  const title =
    typeof passage.title === "string" && passage.title.trim()
      ? passage.title.trim()
      : undefined;
  const imageUrl =
    typeof passage.imageUrl === "string" && passage.imageUrl.trim()
      ? passage.imageUrl.trim()
      : undefined;
  const imageAlt =
    typeof passage.imageAlt === "string" && passage.imageAlt.trim()
      ? passage.imageAlt.trim()
      : undefined;
  if (imageUrl && !imageAlt) {
    throw new Error("passage.imageAlt is required when passage.imageUrl is set.");
  }
  return {
    ...(title ? { title } : {}),
    text,
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageAlt ? { imageAlt } : {}),
  };
}

/** Validate a read-and-answer authoring document (3–5 questions). */
export function validateReadAndAnswerDocument(raw: unknown): ReadAndAnswerDocument {
  const doc = assertRecord(raw, "read and answer document");
  if (doc.version !== 1) {
    throw new Error("read and answer document.version must be 1.");
  }
  if (doc.kind !== READ_AND_ANSWER_KIND) {
    throw new Error(`read and answer document.kind must be "${READ_AND_ANSWER_KIND}".`);
  }
  if (!Array.isArray(doc.questions) || doc.questions.length < 3) {
    throw new Error("Need at least 3 questions.");
  }
  if (doc.questions.length > 5) {
    throw new Error("Supports at most 5 questions.");
  }

  const questions = doc.questions.map((question, index) => parseQuestion(question, index));

  return {
    version: 1,
    kind: READ_AND_ANSWER_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
    passage: parsePassage(doc.passage),
    questions,
    shuffleOptions: doc.shuffleOptions !== false,
  };
}

export function toReadAndAnswerPlayable(
  document: ReadAndAnswerDocument,
): ReadAndAnswerPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    passage: { ...document.passage },
    questions: document.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
    })),
    shuffleOptions: document.shuffleOptions,
  };
}

export function readAndAnswerStubPack(
  document: ReadAndAnswerDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "read-and-answer-pack",
    id: document.id,
    title: document.title,
    question_count: document.questions.length,
    document,
  };
}

export function resolveReadAndAnswerFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): ReadAndAnswerDocument {
  if (input.authoring) {
    try {
      return validateReadAndAnswerDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "read and answer pack");
  if (pack.document) {
    return validateReadAndAnswerDocument(pack.document);
  }
  return validateReadAndAnswerDocument(pack);
}

import type {
  PictureWritingDocument,
  PictureWritingPlayable,
  PictureWritingPrompt,
} from "@/lib/picture-writing/types";
import {
  DEFAULT_PICTURE_WRITING_INSTRUCTIONS,
  PICTURE_WRITING_KIND,
} from "@/lib/picture-writing/types";

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

function parsePrompt(raw: unknown, index: number): PictureWritingPrompt {
  const prompt = assertRecord(raw, `prompts[${index}]`);
  const minWordsRaw = prompt.minWords;
  if (
    typeof minWordsRaw !== "number" ||
    !Number.isInteger(minWordsRaw) ||
    minWordsRaw < 4 ||
    minWordsRaw > 20
  ) {
    throw new Error(`prompts[${index}].minWords must be an integer from 4–20.`);
  }
  const sentenceStarter =
    typeof prompt.sentenceStarter === "string" && prompt.sentenceStarter.trim()
      ? prompt.sentenceStarter.trim()
      : undefined;
  return {
    id: assertString(prompt.id, `prompts[${index}].id`),
    imageUrl: assertString(prompt.imageUrl, `prompts[${index}].imageUrl`),
    imageAlt: assertString(prompt.imageAlt, `prompts[${index}].imageAlt`),
    question: assertString(prompt.question, `prompts[${index}].question`),
    promptWords: assertStringList(
      prompt.promptWords,
      `prompts[${index}].promptWords`,
      2,
      5,
    ),
    requiredWords: assertStringList(
      prompt.requiredWords,
      `prompts[${index}].requiredWords`,
      1,
      4,
    ),
    ...(sentenceStarter ? { sentenceStarter } : {}),
    minWords: minWordsRaw,
  };
}

/** Validate a picture writing authoring document (flexible prompt count ≥ 1). */
export function validatePictureWritingDocument(
  raw: unknown,
): PictureWritingDocument {
  const doc = assertRecord(raw, "picture writing document");
  if (doc.version !== 1) {
    throw new Error("picture writing document.version must be 1.");
  }
  if (doc.kind !== PICTURE_WRITING_KIND) {
    throw new Error(
      `picture writing document.kind must be "${PICTURE_WRITING_KIND}".`,
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
    kind: PICTURE_WRITING_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_PICTURE_WRITING_INSTRUCTIONS,
    prompts,
    ...(cefr ? { cefr } : {}),
  };
}

export function toPictureWritingPlayable(
  document: PictureWritingDocument,
): PictureWritingPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    prompts: document.prompts.map((prompt) => ({
      ...prompt,
      promptWords: [...prompt.promptWords],
      requiredWords: [...prompt.requiredWords],
    })),
  };
}

export function pictureWritingStubPack(
  document: PictureWritingDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "picture-writing-pack",
    id: document.id,
    title: document.title,
    prompt_count: document.prompts.length,
    document,
  };
}

export function resolvePictureWritingFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): PictureWritingDocument {
  if (input.authoring) {
    try {
      return validatePictureWritingDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "picture writing pack");
  if (pack.document) {
    return validatePictureWritingDocument(pack.document);
  }
  return validatePictureWritingDocument(pack);
}

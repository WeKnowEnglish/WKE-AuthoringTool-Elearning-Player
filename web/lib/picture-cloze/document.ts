import type {
  PictureClozeDocument,
  PictureClozeItem,
  PictureClozePlayable,
} from "@/lib/picture-cloze/types";
import {
  DEFAULT_PICTURE_CLOZE_INSTRUCTIONS,
  PICTURE_CLOZE_KIND,
} from "@/lib/picture-cloze/types";

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

function assertStringAllowEmpty(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  return value;
}

function parseItem(raw: unknown, index: number): PictureClozeItem {
  const item = assertRecord(raw, `items[${index}]`);
  const acceptedRaw = item.acceptedAnswers;
  if (!Array.isArray(acceptedRaw) || acceptedRaw.length < 1) {
    throw new Error(`items[${index}].acceptedAnswers needs at least one answer.`);
  }
  const acceptedAnswers = acceptedRaw.map((answer, answerIndex) =>
    assertString(answer, `items[${index}].acceptedAnswers[${answerIndex}]`),
  );
  return {
    id: assertString(item.id, `items[${index}].id`),
    imageUrl: assertString(item.imageUrl, `items[${index}].imageUrl`),
    imageAlt: assertString(item.imageAlt, `items[${index}].imageAlt`),
    prompt: assertString(item.prompt, `items[${index}].prompt`),
    sentenceBefore: assertStringAllowEmpty(
      item.sentenceBefore,
      `items[${index}].sentenceBefore`,
    ),
    sentenceAfter: assertStringAllowEmpty(
      item.sentenceAfter,
      `items[${index}].sentenceAfter`,
    ),
    acceptedAnswers,
  };
}

/** Validate a picture cloze authoring document (flexible item count ≥ 1). */
export function validatePictureClozeDocument(raw: unknown): PictureClozeDocument {
  const doc = assertRecord(raw, "picture cloze document");
  if (doc.version !== 1) {
    throw new Error("picture cloze document.version must be 1.");
  }
  if (doc.kind !== PICTURE_CLOZE_KIND) {
    throw new Error(`picture cloze document.kind must be "${PICTURE_CLOZE_KIND}".`);
  }
  if (!Array.isArray(doc.wordBank) || doc.wordBank.length < 1) {
    throw new Error("wordBank needs at least one word.");
  }
  if (!Array.isArray(doc.items) || doc.items.length < 1) {
    throw new Error("items needs at least one picture cloze item.");
  }

  const wordBank = doc.wordBank.map((word, index) =>
    assertString(word, `wordBank[${index}]`),
  );
  const items = doc.items.map((item, index) => parseItem(item, index));
  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: PICTURE_CLOZE_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_PICTURE_CLOZE_INSTRUCTIONS,
    wordBank,
    items,
    ...(cefr ? { cefr } : {}),
  };
}

export function toPictureClozePlayable(
  document: PictureClozeDocument,
): PictureClozePlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    wordBank: [...document.wordBank],
    items: document.items.map((item) => ({ ...item })),
  };
}

/** Stub pack so studio_activities.pack stays a non-null object. */
export function pictureClozeStubPack(
  document: PictureClozeDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "picture-cloze-pack",
    id: document.id,
    title: document.title,
    item_count: document.items.length,
    document,
  };
}

/** Resolve a playable document from bank pack and/or authoring. */
export function resolvePictureClozeFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): PictureClozeDocument {
  if (input.authoring) {
    try {
      return validatePictureClozeDocument(input.authoring);
    } catch {
      /* Fall through to pack.document. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "picture cloze pack");
  if (pack.document) {
    return validatePictureClozeDocument(pack.document);
  }
  return validatePictureClozeDocument(pack);
}

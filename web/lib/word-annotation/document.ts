import type {
  WordAnnotationDocument,
  WordAnnotationPlayable,
  WordAnnotationRole,
  WordAnnotationSentence,
  WordAnnotationToken,
} from "@/lib/word-annotation/types";
import {
  DEFAULT_WORD_ANNOTATION_INSTRUCTIONS,
  DEFAULT_WORD_ANNOTATION_REMEMBER,
  WORD_ANNOTATION_KIND,
  WORD_ANNOTATION_ROLES,
} from "@/lib/word-annotation/types";

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

function isWordAnnotationRole(value: unknown): value is WordAnnotationRole {
  return (
    typeof value === "string" &&
    (WORD_ANNOTATION_ROLES as readonly string[]).includes(value)
  );
}

function parseToken(raw: unknown, path: string): WordAnnotationToken {
  const token = assertRecord(raw, path);
  const roleRaw = token.role;
  let role: WordAnnotationRole | null = null;
  if (roleRaw != null) {
    if (!isWordAnnotationRole(roleRaw)) {
      throw new Error(`${path}.role is invalid.`);
    }
    role = roleRaw;
  }
  return {
    id: assertString(token.id, `${path}.id`),
    text: assertString(token.text, `${path}.text`),
    role,
  };
}

function parseSentence(raw: unknown, index: number): WordAnnotationSentence {
  const sentence = assertRecord(raw, `sentences[${index}]`);
  if (!Array.isArray(sentence.tokens) || sentence.tokens.length < 2) {
    throw new Error(`sentences[${index}].tokens needs at least 2 tokens.`);
  }
  return {
    id: assertString(sentence.id, `sentences[${index}].id`),
    tokens: sentence.tokens.map((token, tokenIndex) =>
      parseToken(token, `sentences[${index}].tokens[${tokenIndex}]`),
    ),
  };
}

/** Validate a word annotation authoring document (flexible sentence count ≥ 1). */
export function validateWordAnnotationDocument(
  raw: unknown,
): WordAnnotationDocument {
  const doc = assertRecord(raw, "word annotation document");
  if (doc.version !== 1) {
    throw new Error("word annotation document.version must be 1.");
  }
  if (doc.kind !== WORD_ANNOTATION_KIND) {
    throw new Error(
      `word annotation document.kind must be "${WORD_ANNOTATION_KIND}".`,
    );
  }
  if (!Array.isArray(doc.sentences) || doc.sentences.length < 1) {
    throw new Error("sentences needs at least one sentence.");
  }

  const sentences = doc.sentences.map((sentence, index) =>
    parseSentence(sentence, index),
  );
  const hasTarget = sentences.some((sentence) =>
    sentence.tokens.some((token) => token.role),
  );
  if (!hasTarget) {
    throw new Error("At least one token must have an adjective or adverb role.");
  }

  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: WORD_ANNOTATION_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_WORD_ANNOTATION_INSTRUCTIONS,
    rememberText:
      typeof doc.rememberText === "string" && doc.rememberText.trim()
        ? doc.rememberText.trim()
        : DEFAULT_WORD_ANNOTATION_REMEMBER,
    sentences,
    ...(cefr ? { cefr } : {}),
  };
}

export function toWordAnnotationPlayable(
  document: WordAnnotationDocument,
): WordAnnotationPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    rememberText: document.rememberText,
    sentences: document.sentences.map((sentence) => ({
      id: sentence.id,
      tokens: sentence.tokens.map((token) => ({ ...token })),
    })),
  };
}

export function wordAnnotationStubPack(
  document: WordAnnotationDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "word-annotation-pack",
    id: document.id,
    title: document.title,
    sentence_count: document.sentences.length,
    document,
  };
}

export function resolveWordAnnotationFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): WordAnnotationDocument {
  if (input.authoring) {
    try {
      return validateWordAnnotationDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "word annotation pack");
  if (pack.document) {
    return validateWordAnnotationDocument(pack.document);
  }
  return validateWordAnnotationDocument(pack);
}

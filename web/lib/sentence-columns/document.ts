import type {
  SentenceColumnChallenge,
  SentenceColumnDef,
  SentenceColumnId,
  SentenceColumnPiece,
  SentenceColumnsDocument,
  SentenceColumnsPlayable,
} from "@/lib/sentence-columns/types";
import {
  DEFAULT_SENTENCE_COLUMNS,
  DEFAULT_SENTENCE_COLUMNS_INSTRUCTIONS,
  SENTENCE_COLUMN_IDS,
  SENTENCE_COLUMNS_KIND,
} from "@/lib/sentence-columns/types";

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

function isSentenceColumnId(value: unknown): value is SentenceColumnId {
  return (
    typeof value === "string" &&
    (SENTENCE_COLUMN_IDS as readonly string[]).includes(value)
  );
}

function parseColumns(raw: unknown): SentenceColumnDef[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return DEFAULT_SENTENCE_COLUMNS.map((column) => ({ ...column }));
  }
  const columns: SentenceColumnDef[] = [];
  for (const [index, value] of raw.entries()) {
    const column = assertRecord(value, `columns[${index}]`);
    if (!isSentenceColumnId(column.id)) {
      throw new Error(`columns[${index}].id is invalid.`);
    }
    columns.push({
      id: column.id,
      label: assertString(column.label, `columns[${index}].label`),
      prompt: assertString(column.prompt, `columns[${index}].prompt`),
    });
  }
  for (const id of SENTENCE_COLUMN_IDS) {
    if (!columns.some((column) => column.id === id)) {
      throw new Error(`columns must include ${id}.`);
    }
  }
  return columns;
}

function parsePiece(raw: unknown, path: string): SentenceColumnPiece {
  const piece = assertRecord(raw, path);
  if (!isSentenceColumnId(piece.columnId)) {
    throw new Error(`${path}.columnId is invalid.`);
  }
  return {
    id: assertString(piece.id, `${path}.id`),
    text: assertString(piece.text, `${path}.text`),
    columnId: piece.columnId,
  };
}

function parseChallenge(raw: unknown, index: number): SentenceColumnChallenge {
  const challenge = assertRecord(raw, `challenges[${index}]`);
  if (!Array.isArray(challenge.pieces) || challenge.pieces.length !== 3) {
    throw new Error(`challenges[${index}].pieces must have exactly 3 pieces.`);
  }
  const pieces = challenge.pieces.map((piece, pieceIndex) =>
    parsePiece(piece, `challenges[${index}].pieces[${pieceIndex}]`),
  );
  for (const id of SENTENCE_COLUMN_IDS) {
    if (!pieces.some((piece) => piece.columnId === id)) {
      throw new Error(`challenges[${index}] needs one piece for each column.`);
    }
  }
  return {
    id: assertString(challenge.id, `challenges[${index}].id`),
    pieces,
  };
}

/** Validate a sentence columns authoring document (flexible challenge count ≥ 1). */
export function validateSentenceColumnsDocument(
  raw: unknown,
): SentenceColumnsDocument {
  const doc = assertRecord(raw, "sentence columns document");
  if (doc.version !== 1) {
    throw new Error("sentence columns document.version must be 1.");
  }
  if (doc.kind !== SENTENCE_COLUMNS_KIND) {
    throw new Error(
      `sentence columns document.kind must be "${SENTENCE_COLUMNS_KIND}".`,
    );
  }
  if (!Array.isArray(doc.challenges) || doc.challenges.length < 1) {
    throw new Error("challenges needs at least one sentence.");
  }

  const challenges = doc.challenges.map((challenge, index) =>
    parseChallenge(challenge, index),
  );
  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: SENTENCE_COLUMNS_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_SENTENCE_COLUMNS_INSTRUCTIONS,
    columns: parseColumns(doc.columns),
    challenges,
    ...(cefr ? { cefr } : {}),
  };
}

export function toSentenceColumnsPlayable(
  document: SentenceColumnsDocument,
): SentenceColumnsPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    columns: document.columns.map((column) => ({ ...column })),
    challenges: document.challenges.map((challenge) => ({
      id: challenge.id,
      pieces: challenge.pieces.map((piece) => ({ ...piece })),
    })),
  };
}

export function sentenceColumnsStubPack(
  document: SentenceColumnsDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "sentence-columns-pack",
    id: document.id,
    title: document.title,
    challenge_count: document.challenges.length,
    document,
  };
}

export function resolveSentenceColumnsFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): SentenceColumnsDocument {
  if (input.authoring) {
    try {
      return validateSentenceColumnsDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "sentence columns pack");
  if (pack.document) {
    return validateSentenceColumnsDocument(pack.document);
  }
  return validateSentenceColumnsDocument(pack);
}

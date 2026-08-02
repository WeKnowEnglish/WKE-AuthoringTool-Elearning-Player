import type {
  ClozeOpenDocument,
  ClozeOpenGapSegment,
  ClozeOpenPlayable,
  ClozeOpenSegment,
  ClozeOpenTextSegment,
} from "@/lib/cloze-open/types";
import {
  CLOZE_OPEN_KIND,
  DEFAULT_CLOZE_OPEN_INSTRUCTIONS,
  listClozeOpenGaps,
} from "@/lib/cloze-open/types";
import { normalizeOpenClozeAnswer } from "@/lib/cloze-open/scoring";

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

function parseTextSegment(raw: unknown, index: number): ClozeOpenTextSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  return {
    type: "text",
    id: assertString(segment.id, `segments[${index}].id`),
    text: assertString(segment.text, `segments[${index}].text`),
  };
}

function parseGapSegment(
  raw: unknown,
  index: number,
  options: { caseSensitive: boolean; punctuationSensitive: boolean },
): ClozeOpenGapSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  if (!Array.isArray(segment.correctAnswers) || segment.correctAnswers.length < 1) {
    throw new Error(`segments[${index}].correctAnswers needs at least 1 answer.`);
  }
  if (segment.correctAnswers.length > 5) {
    throw new Error(`segments[${index}].correctAnswers supports at most 5 answers.`);
  }
  const correctAnswers = segment.correctAnswers.map((answer, answerIndex) =>
    assertString(answer, `segments[${index}].correctAnswers[${answerIndex}]`),
  );
  const normalized = correctAnswers.map((answer) =>
    normalizeOpenClozeAnswer(answer, options),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`segments[${index}].correctAnswers must be unique.`);
  }
  const hint =
    typeof segment.hint === "string" && segment.hint.trim()
      ? segment.hint.trim()
      : undefined;
  return {
    type: "gap",
    id: assertString(segment.id, `segments[${index}].id`),
    correctAnswers,
    ...(hint ? { hint } : {}),
  };
}

function parseSegment(
  raw: unknown,
  index: number,
  options: { caseSensitive: boolean; punctuationSensitive: boolean },
): ClozeOpenSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  if (segment.type === "text") return parseTextSegment(raw, index);
  if (segment.type === "gap") return parseGapSegment(raw, index, options);
  throw new Error(`segments[${index}].type must be "text" or "gap".`);
}

/** Validate a cloze-open authoring document (3–5 gaps). */
export function validateClozeOpenDocument(raw: unknown): ClozeOpenDocument {
  const doc = assertRecord(raw, "cloze open document");
  if (doc.version !== 1) {
    throw new Error("cloze open document.version must be 1.");
  }
  if (doc.kind !== CLOZE_OPEN_KIND) {
    throw new Error(`cloze open document.kind must be "${CLOZE_OPEN_KIND}".`);
  }
  if (!Array.isArray(doc.segments) || doc.segments.length < 3) {
    throw new Error("segments needs at least 3 parts (text and gaps).");
  }

  const caseSensitive = doc.caseSensitive === true;
  const punctuationSensitive = doc.punctuationSensitive === true;
  const normalization = { caseSensitive, punctuationSensitive };

  const segments = doc.segments.map((segment, index) =>
    parseSegment(segment, index, normalization),
  );
  const gaps = listClozeOpenGaps(segments);
  if (gaps.length < 3) {
    throw new Error("Need at least 3 gaps.");
  }
  if (gaps.length > 5) {
    throw new Error("Supports at most 5 gaps.");
  }

  const passageTitle =
    typeof doc.passageTitle === "string" && doc.passageTitle.trim()
      ? doc.passageTitle.trim()
      : undefined;

  return {
    version: 1,
    kind: CLOZE_OPEN_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_CLOZE_OPEN_INSTRUCTIONS,
    ...(passageTitle ? { passageTitle } : {}),
    segments,
    caseSensitive,
    punctuationSensitive,
  };
}

export function toClozeOpenPlayable(document: ClozeOpenDocument): ClozeOpenPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    ...(document.passageTitle ? { passageTitle: document.passageTitle } : {}),
    segments: document.segments.map((segment) =>
      segment.type === "text"
        ? { ...segment }
        : {
            ...segment,
            correctAnswers: [...segment.correctAnswers],
            ...(segment.hint ? { hint: segment.hint } : {}),
          },
    ),
    caseSensitive: document.caseSensitive,
    punctuationSensitive: document.punctuationSensitive,
  };
}

export function clozeOpenStubPack(
  document: ClozeOpenDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "cloze-open-pack",
    id: document.id,
    title: document.title,
    gap_count: listClozeOpenGaps(document.segments).length,
    document,
  };
}

export function resolveClozeOpenFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): ClozeOpenDocument {
  if (input.authoring) {
    try {
      return validateClozeOpenDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "cloze open pack");
  if (pack.document) {
    return validateClozeOpenDocument(pack.document);
  }
  return validateClozeOpenDocument(pack);
}

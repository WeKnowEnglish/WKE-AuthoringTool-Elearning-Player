import type {
  ClozeChoiceDocument,
  ClozeChoiceGapSegment,
  ClozeChoicePlayable,
  ClozeChoiceSegment,
  ClozeChoiceTextSegment,
} from "@/lib/cloze-choice/types";
import {
  CLOZE_CHOICE_KIND,
  DEFAULT_CLOZE_CHOICE_INSTRUCTIONS,
  listClozeChoiceGaps,
} from "@/lib/cloze-choice/types";

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

function parseTextSegment(raw: unknown, index: number): ClozeChoiceTextSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  return {
    type: "text",
    id: assertString(segment.id, `segments[${index}].id`),
    text: assertString(segment.text, `segments[${index}].text`),
  };
}

function parseGapSegment(raw: unknown, index: number): ClozeChoiceGapSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  if (!Array.isArray(segment.options) || segment.options.length < 2) {
    throw new Error(`segments[${index}].options needs at least 2 choices.`);
  }
  if (segment.options.length > 4) {
    throw new Error(`segments[${index}].options supports at most 4 choices.`);
  }
  const options = segment.options.map((option, optionIndex) =>
    assertString(option, `segments[${index}].options[${optionIndex}]`),
  );
  const normalized = options.map((option) => option.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`segments[${index}].options must be unique.`);
  }
  const correctAnswer = assertString(
    segment.correctAnswer,
    `segments[${index}].correctAnswer`,
  );
  if (!options.includes(correctAnswer)) {
    throw new Error(
      `segments[${index}].correctAnswer must be one of the options.`,
    );
  }
  return {
    type: "gap",
    id: assertString(segment.id, `segments[${index}].id`),
    options,
    correctAnswer,
  };
}

function parseSegment(raw: unknown, index: number): ClozeChoiceSegment {
  const segment = assertRecord(raw, `segments[${index}]`);
  if (segment.type === "text") return parseTextSegment(raw, index);
  if (segment.type === "gap") return parseGapSegment(raw, index);
  throw new Error(`segments[${index}].type must be "text" or "gap".`);
}

/** Validate a cloze-choice authoring document (3–5 gaps). */
export function validateClozeChoiceDocument(raw: unknown): ClozeChoiceDocument {
  const doc = assertRecord(raw, "cloze choice document");
  if (doc.version !== 1) {
    throw new Error("cloze choice document.version must be 1.");
  }
  if (doc.kind !== CLOZE_CHOICE_KIND) {
    throw new Error(`cloze choice document.kind must be "${CLOZE_CHOICE_KIND}".`);
  }
  if (!Array.isArray(doc.segments) || doc.segments.length < 3) {
    throw new Error("segments needs at least 3 parts (text and gaps).");
  }

  const segments = doc.segments.map((segment, index) => parseSegment(segment, index));
  const gaps = listClozeChoiceGaps(segments);
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
    kind: CLOZE_CHOICE_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_CLOZE_CHOICE_INSTRUCTIONS,
    ...(passageTitle ? { passageTitle } : {}),
    segments,
    shuffleOptions: doc.shuffleOptions !== false,
  };
}

export function toClozeChoicePlayable(
  document: ClozeChoiceDocument,
): ClozeChoicePlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    ...(document.passageTitle ? { passageTitle: document.passageTitle } : {}),
    segments: document.segments.map((segment) =>
      segment.type === "text"
        ? { ...segment }
        : { ...segment, options: [...segment.options] },
    ),
    shuffleOptions: document.shuffleOptions,
  };
}

export function clozeChoiceStubPack(
  document: ClozeChoiceDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "cloze-choice-pack",
    id: document.id,
    title: document.title,
    gap_count: listClozeChoiceGaps(document.segments).length,
    document,
  };
}

export function resolveClozeChoiceFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): ClozeChoiceDocument {
  if (input.authoring) {
    try {
      return validateClozeChoiceDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "cloze choice pack");
  if (pack.document) {
    return validateClozeChoiceDocument(pack.document);
  }
  return validateClozeChoiceDocument(pack);
}

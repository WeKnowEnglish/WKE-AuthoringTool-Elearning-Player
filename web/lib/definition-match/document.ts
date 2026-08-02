import type {
  DefinitionMatchDocument,
  DefinitionMatchPair,
  DefinitionMatchPlayable,
} from "@/lib/definition-match/types";
import {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFINITION_MATCH_KIND,
} from "@/lib/definition-match/types";

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePair(raw: unknown, index: number): DefinitionMatchPair {
  const pair = assertRecord(raw, `pairs[${index}]`);
  const word = assertString(pair.word, `pairs[${index}].word`);
  const definition = assertString(pair.definition, `pairs[${index}].definition`);
  const wordPattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  if (wordPattern.test(definition)) {
    throw new Error(
      `pairs[${index}].definition should not contain the answer word “${word}”.`,
    );
  }
  return {
    id: assertString(pair.id, `pairs[${index}].id`),
    word,
    definition,
  };
}

/** Validate a definition match authoring document (4–10 unique pairs). */
export function validateDefinitionMatchDocument(
  raw: unknown,
): DefinitionMatchDocument {
  const doc = assertRecord(raw, "definition match document");
  if (doc.version !== 1) {
    throw new Error("definition match document.version must be 1.");
  }
  if (doc.kind !== DEFINITION_MATCH_KIND) {
    throw new Error(
      `definition match document.kind must be "${DEFINITION_MATCH_KIND}".`,
    );
  }
  if (!Array.isArray(doc.pairs) || doc.pairs.length < 4) {
    throw new Error("pairs needs at least 4 word-definition pairs.");
  }
  if (doc.pairs.length > 10) {
    throw new Error("pairs supports at most 10 pairs.");
  }

  const pairs = doc.pairs.map((pair, index) => parsePair(pair, index));
  const normalizedWords = pairs.map((pair) => pair.word.toLocaleLowerCase());
  if (new Set(normalizedWords).size !== normalizedWords.length) {
    throw new Error("Each word must be unique.");
  }

  const cefr =
    typeof doc.cefr === "string" && doc.cefr.trim() ? doc.cefr.trim() : undefined;

  return {
    version: 1,
    kind: DEFINITION_MATCH_KIND,
    id: assertString(doc.id, "id"),
    title: assertString(doc.title, "title"),
    instructions:
      typeof doc.instructions === "string" && doc.instructions.trim()
        ? doc.instructions.trim()
        : DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
    pairs,
    shuffleWords: doc.shuffleWords !== false,
    ...(cefr ? { cefr } : {}),
  };
}

export function toDefinitionMatchPlayable(
  document: DefinitionMatchDocument,
): DefinitionMatchPlayable {
  return {
    title: document.title,
    instructions: document.instructions,
    pairs: document.pairs.map((pair) => ({ ...pair })),
    shuffleWords: document.shuffleWords,
  };
}

export function definitionMatchStubPack(
  document: DefinitionMatchDocument,
): Record<string, unknown> {
  return {
    version: 1,
    kind: "definition-match-pack",
    id: document.id,
    title: document.title,
    pair_count: document.pairs.length,
    document,
  };
}

export function resolveDefinitionMatchFromBankPayload(input: {
  pack?: unknown;
  authoring?: unknown;
}): DefinitionMatchDocument {
  if (input.authoring) {
    try {
      return validateDefinitionMatchDocument(input.authoring);
    } catch {
      /* Fall through. */
    }
  }
  const pack = assertRecord(input.pack ?? {}, "definition match pack");
  if (pack.document) {
    return validateDefinitionMatchDocument(pack.document);
  }
  return validateDefinitionMatchDocument(pack);
}

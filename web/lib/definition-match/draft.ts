import { createBlankDefinitionMatchDocument } from "@/lib/definition-match/blank";
import {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFAULT_DEFINITION_MATCH_TITLE,
  DEFINITION_MATCH_KIND,
  DEFINITION_MATCH_MIN_PAIRS,
  type DefinitionMatchDocument,
  type DefinitionMatchPair,
} from "@/lib/definition-match/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readPair(raw: unknown, index: number): DefinitionMatchPair | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return {
    id: asString(row.id, `pair-${index + 1}`),
    word: asString(row.word),
    definition: asString(row.definition),
  };
}

/** Coerce stored JSON into an editable definition-match draft without requiring assign-ready fields. */
export function asDefinitionMatchDraft(raw: unknown): DefinitionMatchDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createBlankDefinitionMatchDocument();
  }
  const row = raw as Record<string, unknown>;
  const pairs = (Array.isArray(row.pairs) ? row.pairs : [])
    .map((pair, index) => readPair(pair, index))
    .filter((pair): pair is DefinitionMatchPair => Boolean(pair));
  const nextPairs = [...pairs];
  while (nextPairs.length < DEFINITION_MATCH_MIN_PAIRS) {
    nextPairs.push(readPair({}, nextPairs.length)!);
  }
  return {
    version: 1,
    kind: DEFINITION_MATCH_KIND,
    id: asString(row.id) || "definition-match-draft",
    title: asString(row.title, DEFAULT_DEFINITION_MATCH_TITLE),
    instructions: asString(row.instructions, DEFAULT_DEFINITION_MATCH_INSTRUCTIONS),
    pairs: nextPairs,
    shuffleWords: row.shuffleWords !== false,
    ...(typeof row.cefr === "string" && row.cefr.trim()
      ? { cefr: row.cefr.trim() }
      : {}),
  };
}

export function cloneDefinitionMatchDocumentForAuthoring(
  source: DefinitionMatchDocument,
): DefinitionMatchDocument {
  return {
    ...source,
    id: crypto.randomUUID(),
    pairs: source.pairs.map((pair) => ({
      ...pair,
      id: crypto.randomUUID(),
    })),
  };
}

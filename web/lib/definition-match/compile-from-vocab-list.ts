import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { resolveVocabCompileEntries } from "@/lib/activity-builder/games/compile-from-vocab-list";
import {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFINITION_MATCH_KIND,
  type DefinitionMatchDocument,
  type DefinitionMatchPair,
} from "@/lib/definition-match/types";
import { validateDefinitionMatchDocument } from "@/lib/definition-match/document";

function slugifyId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "definition-match";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type CompileDefinitionMatchFromVocabListInput = {
  list: VocabularyListDocument;
  selectedEntryIds?: string[];
  maxPairs?: number;
};

/**
 * Build a definition match document from a vocabulary list.
 * Needs at least four entries with non-empty `definitionEn` that do not contain the word.
 */
export function compileDefinitionMatchFromVocabList(
  input: CompileDefinitionMatchFromVocabListInput,
): DefinitionMatchDocument {
  const entries = resolveVocabCompileEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }

  const maxPairs = Math.max(
    4,
    Math.min(10, Math.round(input.maxPairs ?? 8)),
  );

  const pairs: DefinitionMatchPair[] = [];
  const seenWords = new Set<string>();

  for (const entry of entries) {
    if (pairs.length >= maxPairs) break;
    const word = entry.word.trim();
    const definition = entry.definitionEn?.trim() ?? "";
    if (!word || !definition) continue;
    const key = word.toLocaleLowerCase();
    if (seenWords.has(key)) continue;
    const wordPattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
    if (wordPattern.test(definition)) continue;

    seenWords.add(key);
    pairs.push({
      id: `dm-${entry.id}`,
      word,
      definition,
    });
  }

  if (pairs.length < 4) {
    throw new Error(
      "Definition match needs at least four vocabulary words with English definitions that do not contain the answer word.",
    );
  }

  const listName = input.list.name.trim() || "Vocabulary";
  const title = `${listName} · Definition match`;
  return validateDefinitionMatchDocument({
    version: 1,
    kind: DEFINITION_MATCH_KIND,
    id: slugifyId(title),
    title,
    instructions: DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
    pairs,
    shuffleWords: true,
    ...(input.list.cefr ? { cefr: input.list.cefr } : {}),
  });
}

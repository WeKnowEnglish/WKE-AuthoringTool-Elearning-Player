import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import {
  buildFlashcardFaceSnapshot,
  isUsableFlashcardLexeme,
  missingFlashcardFaces,
} from "./readiness";
import type {
  PackFlashcardCompiledCard,
  PackFlashcardCompileResult,
  PackFlashcardDraft,
  PackFlashcardFaceOverrides,
  PackFlashcardLexemeSource,
} from "./types";
import { validatePackFlashcardOptions } from "./types";

/**
 * Compile a flashcard deck from a frozen pack draft + lexemes.
 * Skips words missing any included face (unless overrides fill the gap).
 * Warnings list skipped lemmas and option issues.
 */
export function compilePackFlashcards(input: {
  draft: PackFlashcardDraft;
  lexemes: readonly PackFlashcardLexemeSource[];
  /** Optional per-word face overrides (preview edits). */
  overridesByWordId?: ReadonlyMap<string, PackFlashcardFaceOverrides> | null;
  seed?: string;
}): PackFlashcardCompileResult {
  const warnings: string[] = [];
  const skippedWordIds: string[] = [];
  const cards: PackFlashcardCompiledCard[] = [];

  const optionsResult = validatePackFlashcardOptions(input.draft.options);
  if (!optionsResult.ok) {
    return {
      draft: input.draft,
      cards: [],
      skippedWordIds: [...input.draft.wordIds],
      warnings: optionsResult.errors,
    };
  }

  const options = optionsResult.options;
  const byId = new Map(input.lexemes.map((row) => [row.id, row]));
  const seedBase = input.seed ?? input.draft.createdAt;

  for (const id of input.draft.wordIds) {
    const row = byId.get(id);
    const overrides = input.overridesByWordId?.get(id) ?? null;

    if (!row || !isUsableFlashcardLexeme(row)) {
      skippedWordIds.push(id);
      continue;
    }

    const missing = missingFlashcardFaces(row, options.includeFaces, overrides);
    if (missing.length > 0) {
      skippedWordIds.push(id);
      warnings.push(
        `Skipped “${row.lemma.trim()}” — missing ${missing.join(", ")}.`,
      );
      continue;
    }

    const faces = buildFlashcardFaceSnapshot(row, options.includeFaces, overrides);
    if (!faces) {
      skippedWordIds.push(id);
      warnings.push(`Skipped “${row.lemma.trim()}” — could not build faces.`);
      continue;
    }

    cards.push({
      id: `${row.id}:flashcard`,
      wordId: row.id,
      faces,
      frontFaces: [...options.frontFaces],
      backFaces: [...options.backFaces],
    });
  }

  if (cards.length === 0) {
    warnings.push("Could not build any flashcards from this selection.");
  }

  const orderedCards = options.shuffle
    ? shuffleWithSeed(cards, `${seedBase}:cards`)
    : cards;

  return {
    draft: {
      ...input.draft,
      options,
    },
    cards: orderedCards,
    skippedWordIds,
    warnings,
  };
}

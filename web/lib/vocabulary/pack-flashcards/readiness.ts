import type {
  PackFlashcardFace,
  PackFlashcardFaceOverrides,
  PackFlashcardFaceSnapshot,
  PackFlashcardLexemeSource,
} from "./types";
import { PACK_FLASHCARD_FACES } from "./types";

export type PackFlashcardFacePresence = Record<PackFlashcardFace, boolean>;

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

/** Base lexeme usable for flashcards (has a word surface). */
export function isUsableFlashcardLexeme(row: PackFlashcardLexemeSource): boolean {
  if (row.source === "missing") return false;
  if (row.archived) return false;
  return Boolean(row.lemma.trim());
}

/**
 * Resolve a single face value from lexeme + optional override.
 * Definition uses English only in F0.
 */
export function resolveFlashcardFaceValue(
  face: PackFlashcardFace,
  lexeme: PackFlashcardLexemeSource,
  overrides?: PackFlashcardFaceOverrides | null,
): string | null {
  const fromOverride = (() => {
    if (!overrides) return null;
    if (face === "word") return trimOrNull(overrides.word);
    if (face === "definition") return trimOrNull(overrides.definition);
    if (face === "example") return trimOrNull(overrides.example);
    return trimOrNull(overrides.pictureUrl);
  })();
  if (fromOverride) return fromOverride;

  if (face === "word") return trimOrNull(lexeme.lemma);
  if (face === "definition") return trimOrNull(lexeme.definitionEn);
  if (face === "example") return trimOrNull(lexeme.exampleSentence);
  return trimOrNull(lexeme.pictureUrl);
}

/** Which of the four faces have a value (lexeme or override). */
export function flashcardFacePresence(
  lexeme: PackFlashcardLexemeSource,
  overrides?: PackFlashcardFaceOverrides | null,
): PackFlashcardFacePresence {
  const presence = {} as PackFlashcardFacePresence;
  for (const face of PACK_FLASHCARD_FACES) {
    presence[face] = resolveFlashcardFaceValue(face, lexeme, overrides) != null;
  }
  return presence;
}

/** Included faces that still have no value after overrides. */
export function missingFlashcardFaces(
  lexeme: PackFlashcardLexemeSource,
  includeFaces: readonly PackFlashcardFace[],
  overrides?: PackFlashcardFaceOverrides | null,
): PackFlashcardFace[] {
  return includeFaces.filter(
    (face) => resolveFlashcardFaceValue(face, lexeme, overrides) == null,
  );
}

export function canBuildFlashcard(
  lexeme: PackFlashcardLexemeSource,
  includeFaces: readonly PackFlashcardFace[],
  overrides?: PackFlashcardFaceOverrides | null,
): boolean {
  if (!isUsableFlashcardLexeme(lexeme)) return false;
  return missingFlashcardFaces(lexeme, includeFaces, overrides).length === 0;
}

/** Build frozen face snapshot for included faces only. */
export function buildFlashcardFaceSnapshot(
  lexeme: PackFlashcardLexemeSource,
  includeFaces: readonly PackFlashcardFace[],
  overrides?: PackFlashcardFaceOverrides | null,
): PackFlashcardFaceSnapshot | null {
  if (!canBuildFlashcard(lexeme, includeFaces, overrides)) return null;

  const faces: PackFlashcardFaceSnapshot = {};
  for (const face of includeFaces) {
    const value = resolveFlashcardFaceValue(face, lexeme, overrides);
    if (!value) return null;
    if (face === "word") faces.word = value;
    else if (face === "definition") faces.definition = value;
    else if (face === "example") faces.example = value;
    else faces.pictureUrl = value;
  }
  return faces;
}

/** Short picker hint: which included faces are ready. */
export function flashcardLexemeReadinessLabel(
  lexeme: PackFlashcardLexemeSource,
  includeFaces: readonly PackFlashcardFace[],
  overrides?: PackFlashcardFaceOverrides | null,
): string {
  if (!isUsableFlashcardLexeme(lexeme)) return "Unavailable";
  const missing = missingFlashcardFaces(lexeme, includeFaces, overrides);
  if (missing.length === 0) return "Ready";
  return `Missing ${missing.join(", ")}`;
}

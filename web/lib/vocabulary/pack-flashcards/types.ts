/**
 * Pack → flashcard draft contract (Slice F0).
 * Four student faces only: word, definition, example, picture.
 */

import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";

export const PACK_FLASHCARD_FACES = [
  "word",
  "definition",
  "example",
  "picture",
] as const;

export type PackFlashcardFace = (typeof PACK_FLASHCARD_FACES)[number];

export const PACK_FLASHCARD_MIN_WORDS = 1;
/** At least two faces so front/back can differ. */
export const PACK_FLASHCARD_MIN_FACES = 2;

export type PackFlashcardOptions = {
  /** Faces included in this set (subset of the four). */
  includeFaces: PackFlashcardFace[];
  /** Faces shown before flip (non-empty; subset of includeFaces). */
  frontFaces: PackFlashcardFace[];
  /** Faces shown after flip (non-empty; subset of includeFaces). */
  backFaces: PackFlashcardFace[];
  /** When true, card order is seeded-shuffled at compile. */
  shuffle?: boolean;
};

export type PackFlashcardDraft = {
  packId: string;
  packTitle: string;
  /** Frozen snapshot of selected pack word ids at generate. */
  wordIds: string[];
  options: PackFlashcardOptions;
  createdAt: string;
};

/** Frozen face values on a compiled card (only included faces present). */
export type PackFlashcardFaceSnapshot = {
  word?: string;
  definition?: string;
  example?: string;
  pictureUrl?: string;
};

export type PackFlashcardCompiledCard = {
  id: string;
  wordId: string;
  faces: PackFlashcardFaceSnapshot;
  frontFaces: PackFlashcardFace[];
  backFaces: PackFlashcardFace[];
};

export type PackFlashcardCompileResult = {
  draft: PackFlashcardDraft;
  cards: PackFlashcardCompiledCard[];
  skippedWordIds: string[];
  warnings: string[];
};

/**
 * Lexeme row for flashcard compile.
 * Extends pack resolution with optional example/picture until lexicon stores them.
 */
export type PackFlashcardLexemeSource = PackLexemeResolution & {
  exampleSentence?: string | null;
  pictureUrl?: string | null;
};

/** Per-word overrides applied at compile (preview edits before Save). */
export type PackFlashcardFaceOverrides = {
  word?: string;
  definition?: string;
  example?: string;
  pictureUrl?: string;
};

export type PackFlashcardOptionsValidation =
  | { ok: true; options: PackFlashcardOptions }
  | { ok: false; errors: string[] };

export function isPackFlashcardFace(value: unknown): value is PackFlashcardFace {
  return (
    typeof value === "string" &&
    (PACK_FLASHCARD_FACES as readonly string[]).includes(value)
  );
}

/** Stable face order matching PACK_FLASHCARD_FACES. */
export function sortPackFlashcardFaces(
  faces: readonly PackFlashcardFace[],
): PackFlashcardFace[] {
  const set = new Set(faces);
  return PACK_FLASHCARD_FACES.filter((face) => set.has(face));
}

/**
 * Keep pack order; drop ids that are not selected or not in the pack.
 * Same contract as pack-quiz freeze.
 */
export function freezeSelectedPackWordIds(
  packWordIds: readonly string[],
  selectedIds: ReadonlySet<string> | readonly string[],
): string[] {
  const selected =
    selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  return packWordIds.filter((id) => selected.has(id));
}

export function createPackFlashcardDraft(input: {
  packId: string;
  packTitle: string;
  wordIds: readonly string[];
  options: PackFlashcardOptions;
}): PackFlashcardDraft {
  return {
    packId: input.packId,
    packTitle: input.packTitle,
    wordIds: [...input.wordIds],
    options: normalizePackFlashcardOptions(input.options),
    createdAt: new Date().toISOString(),
  };
}

/** Drop duplicates and sort; does not validate front/back partition. */
export function normalizePackFlashcardOptions(
  options: PackFlashcardOptions,
): PackFlashcardOptions {
  return {
    includeFaces: sortPackFlashcardFaces(options.includeFaces),
    frontFaces: sortPackFlashcardFaces(options.frontFaces),
    backFaces: sortPackFlashcardFaces(options.backFaces),
    shuffle: Boolean(options.shuffle),
  };
}

/**
 * Validate modular face config.
 * Rules: ≥2 include faces; front/back non-empty; partition of include (no overlap, full cover).
 */
export function validatePackFlashcardOptions(
  options: PackFlashcardOptions,
): PackFlashcardOptionsValidation {
  const errors: string[] = [];
  const normalized = normalizePackFlashcardOptions(options);
  const include = normalized.includeFaces;
  const front = normalized.frontFaces;
  const back = normalized.backFaces;

  if (include.length < PACK_FLASHCARD_MIN_FACES) {
    errors.push(
      `Include at least ${PACK_FLASHCARD_MIN_FACES} faces (word, definition, example, or picture).`,
    );
  }

  for (const face of front) {
    if (!include.includes(face)) {
      errors.push(`Front face "${face}" is not in the included faces.`);
    }
  }
  for (const face of back) {
    if (!include.includes(face)) {
      errors.push(`Back face "${face}" is not in the included faces.`);
    }
  }

  if (front.length < 1) {
    errors.push("Choose at least one front face.");
  }
  if (back.length < 1) {
    errors.push("Choose at least one back face.");
  }

  const overlap = front.filter((face) => back.includes(face));
  if (overlap.length > 0) {
    errors.push(
      `Faces cannot be on both sides: ${overlap.join(", ")}.`,
    );
  }

  const covered = new Set([...front, ...back]);
  const missing = include.filter((face) => !covered.has(face));
  if (missing.length > 0) {
    errors.push(
      `Every included face must be on front or back: missing ${missing.join(", ")}.`,
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, options: normalized };
}

export function packFlashcardWordReadiness(
  wordCount: number,
): { ok: boolean; reason?: string } {
  if (wordCount < PACK_FLASHCARD_MIN_WORDS) {
    return {
      ok: false,
      reason: `Needs at least ${PACK_FLASHCARD_MIN_WORDS} word selected (you have ${wordCount}).`,
    };
  }
  return { ok: true };
}

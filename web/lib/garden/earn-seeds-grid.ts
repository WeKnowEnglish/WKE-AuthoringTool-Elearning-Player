import { grantGardenSeed } from "@/lib/garden/actions";
import { newGardenId } from "@/lib/garden/defaults";
import { isGardenSpellingWordForLevel, getGardenSpellingLevel } from "@/lib/garden/spelling-levels";
import type { GardenSnapshotV1 } from "@/lib/garden/types";
import { LETTER_BAG } from "@/lib/scrabble/scrabble-letters";

export const EARN_SEEDS_GRID_SIZE = 16;
export const EARN_SEEDS_MIN_WORD_LENGTH = 3;

export type LetterGridSession = {
  sessionId: string;
  letters: string[];
  foundWords: string[];
};

export type EarnSeedsSubmitResult =
  | { ok: true; snapshot: GardenSnapshotV1; session: LetterGridSession; word: string }
  | {
      ok: false;
      reason: "empty" | "duplicate_cell" | "too_short" | "too_long" | "not_a_word" | "already_found";
    };

/** Unlocks after the student spells their first spelling-list word. */
export function isEarnSeedsUnlocked(snapshot: GardenSnapshotV1): boolean {
  return snapshot.spelledWords.length > 0;
}

export function isEarnSeedsGridWord(
  word: string,
  spellingLevel: GardenSnapshotV1["spellingLevel"] = 6,
): boolean {
  return isGardenSpellingWordForLevel(word, spellingLevel, EARN_SEEDS_MIN_WORD_LENGTH);
}

export function generateLetterGrid(random: () => number = Math.random): string[] {
  const bag = [...LETTER_BAG];
  const letters: string[] = [];
  for (let i = 0; i < EARN_SEEDS_GRID_SIZE; i++) {
    const idx = Math.floor(random() * bag.length);
    letters.push(bag[idx]!);
  }
  return letters;
}

export function createLetterGridSession(random: () => number = Math.random): LetterGridSession {
  return {
    sessionId: newGardenId(),
    letters: generateLetterGrid(random),
    foundWords: [],
  };
}

export function canAddCellToSelection(selectedIndices: readonly number[], cellIndex: number): boolean {
  return (
    cellIndex >= 0 &&
    cellIndex < EARN_SEEDS_GRID_SIZE &&
    !selectedIndices.includes(cellIndex)
  );
}

/** Build a word from grid cells; null when a cell is reused in the same word. */
export function wordFromCellIndices(
  letters: readonly string[],
  indices: readonly number[],
): string | null {
  const seen = new Set<number>();
  const chars: string[] = [];
  for (const idx of indices) {
    if (idx < 0 || idx >= letters.length || seen.has(idx)) return null;
    seen.add(idx);
    chars.push(letters[idx]!);
  }
  return chars.join("");
}

export function earnSeedsEventId(sessionId: string, word: string): string {
  return `earn-seeds:${sessionId}:${word.toUpperCase()}`;
}

export function trySubmitEarnSeedsWord(
  snapshot: GardenSnapshotV1,
  session: LetterGridSession,
  selectedIndices: number[],
  now = Date.now(),
): EarnSeedsSubmitResult {
  const word = wordFromCellIndices(session.letters, selectedIndices);
  if (word === null) return { ok: false, reason: "duplicate_cell" };
  if (word.length === 0) return { ok: false, reason: "empty" };

  const normalized = word.toUpperCase();
  if (normalized.length < EARN_SEEDS_MIN_WORD_LENGTH) {
    return { ok: false, reason: "too_short" };
  }
  const { spellingLevel } = snapshot;
  const levelConfig = getGardenSpellingLevel(spellingLevel);
  if (normalized.length > levelConfig.maxWordLength) {
    return { ok: false, reason: "too_long" };
  }
  if (!isGardenSpellingWordForLevel(normalized, spellingLevel, EARN_SEEDS_MIN_WORD_LENGTH)) {
    return { ok: false, reason: "not_a_word" };
  }
  if (session.foundWords.includes(normalized)) {
    return { ok: false, reason: "already_found" };
  }

  const nextSnapshot = grantGardenSeed({
    eventId: earnSeedsEventId(session.sessionId, normalized),
    now,
  });

  return {
    ok: true,
    snapshot: nextSnapshot,
    session: {
      ...session,
      foundWords: [...session.foundWords, normalized],
    },
    word: normalized,
  };
}

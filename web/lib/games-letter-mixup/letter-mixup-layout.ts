/** Normalize phrase spacing (trim + collapse runs to single spaces). */
export function normalizeLetterMixupTarget(targetWord: string): string {
  return targetWord.trim().replace(/\s+/g, " ");
}

function seededHash(seedText: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle<T>(items: T[], seedText: string): T[] {
  const out = [...items];
  let seed = seededHash(seedText);
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type LetterMixupLayout = {
  /** Character slots for the answer row (includes `" "` between words). */
  targetChars: string[];
  /** Playable tray letters grouped by word (spaces never appear here). */
  trayGroups: string[][];
  /** Flat tray letters (concatenation of trayGroups). */
  trayLetters: string[];
};

/**
 * Longest word length in the phrase (spaces ignored).
 * Used to size tiles so each word row fits the letter column.
 */
export function maxLetterMixupWordLength(trayGroups: readonly string[][]): number {
  let max = 0;
  for (const group of trayGroups) {
    if (group.length > max) max = group.length;
  }
  return Math.max(1, max);
}

/**
 * Split flat answer-slot indices into per-word rows (breaks on `" "`).
 * Space slots are omitted — rows stack vertically instead.
 */
export function letterMixupAnswerRowRanges(
  targetChars: readonly string[],
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let i = 0; i < targetChars.length; i += 1) {
    if (targetChars[i] === " ") {
      if (start >= 0) {
        ranges.push({ start, end: i });
        start = -1;
      }
      continue;
    }
    if (start < 0) start = i;
  }
  if (start >= 0) ranges.push({ start, end: targetChars.length });
  return ranges;
}

/**
 * Build answer slots + per-word scrambled tray letters.
 * Multi-word phrases keep fixed spaces in the answer row; each word’s letters
 * shuffle only among themselves.
 */
export function buildLetterMixupLayout(
  targetWord: string,
  options: { shuffleLetters: boolean; shuffleSeed: string },
): LetterMixupLayout {
  const normalized = normalizeLetterMixupTarget(targetWord);
  const targetChars = normalized.length > 0 ? normalized.split("") : [];
  const words = normalized.length > 0 ? normalized.split(" ") : [];

  const trayGroups = words.map((word, wordIndex) => {
    const letters = word.split("");
    if (!options.shuffleLetters || letters.length <= 1) return letters;
    return deterministicShuffle(letters, `${options.shuffleSeed}:w${wordIndex}`);
  });

  return {
    targetChars,
    trayGroups,
    trayLetters: trayGroups.flat(),
  };
}

/** Pre-fill locked space cells; letter slots start empty. */
export function buildInitialLetterMixupSlots(
  targetChars: string[],
): Array<{ traySlotKey: string; char: string; locked: boolean } | null> {
  return targetChars.map((ch, index) =>
    ch === " "
      ? { traySlotKey: `space__${index}`, char: " ", locked: true }
      : null,
  );
}

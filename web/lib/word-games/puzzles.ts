export type WordSearchPlacement = {
  id: string;
  word: string;
  cells: Array<{ row: number; col: number }>;
};

export type WordSearchPuzzle = {
  size: number;
  grid: string[][];
  placements: WordSearchPlacement[];
};

export type CrosswordCell = {
  row: number;
  col: number;
  letter: string;
  number?: number;
};

export type CrosswordPlacedEntry = {
  id: string;
  answer: string;
  clue: string;
  direction: "across" | "down";
  row: number;
  col: number;
  number: number;
  cells: Array<{ row: number; col: number }>;
};

export type CrosswordPuzzle = {
  rows: number;
  cols: number;
  cells: CrosswordCell[];
  entries: CrosswordPlacedEntry[];
};

export function puzzleLetters(value: string): string {
  return (value.match(/[A-Za-z]/g) ?? []).join("").toLocaleUpperCase();
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function buildWordSearch(input: {
  words: Array<{ id: string; word: string }>;
  size: number;
  allowBackwards?: boolean;
  allowDiagonals?: boolean;
  allowBackwardsDiagonals?: boolean;
  seed?: string;
}): WordSearchPuzzle {
  const normalized = input.words
    .map((item) => ({ ...item, letters: puzzleLetters(item.word) }))
    .filter((item) => item.letters.length >= 2)
    .sort((a, b) => b.letters.length - a.letters.length);
  const longest = Math.max(8, ...normalized.map((item) => item.letters.length));
  const size = Math.min(18, Math.max(longest, Math.round(input.size)));
  const grid: Array<Array<string | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const random = seededRandom(
    input.seed ?? normalized.map((item) => `${item.id}:${item.letters}`).join("|"),
  );
  const forwardStraight = [
    [0, 1],
    [1, 0],
  ] as const;
  const forwardDiagonal = [
    [1, 1],
    [1, -1],
  ] as const;
  const backwardsStraight = [
    [0, -1],
    [-1, 0],
  ] as const;
  const backwardsDiagonal = [
    [-1, -1],
    [-1, 1],
  ] as const;
  const directions = [
    ...forwardStraight,
    ...(input.allowDiagonals ? forwardDiagonal : []),
    ...(input.allowBackwards ? backwardsStraight : []),
    ...(input.allowBackwardsDiagonals ? backwardsDiagonal : []),
  ];
  const placements: WordSearchPlacement[] = [];

  for (const item of normalized) {
    type Candidate = { row: number; col: number; dr: number; dc: number; overlap: number };
    const candidates: Candidate[] = [];
    for (const [dr, dc] of directions) {
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          const endRow = row + dr * (item.letters.length - 1);
          const endCol = col + dc * (item.letters.length - 1);
          if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
          let overlap = 0;
          let valid = true;
          for (let offset = 0; offset < item.letters.length; offset += 1) {
            const existing = grid[row + dr * offset]![col + dc * offset];
            if (existing && existing !== item.letters[offset]) {
              valid = false;
              break;
            }
            if (existing === item.letters[offset]) overlap += 1;
          }
          if (valid) candidates.push({ row, col, dr, dc, overlap });
        }
      }
    }
    const choice = shuffled(candidates, random).sort((a, b) => b.overlap - a.overlap)[0];
    if (!choice) continue;
    const cells: WordSearchPlacement["cells"] = [];
    for (let offset = 0; offset < item.letters.length; offset += 1) {
      const row = choice.row + choice.dr * offset;
      const col = choice.col + choice.dc * offset;
      grid[row]![col] = item.letters[offset]!;
      cells.push({ row, col });
    }
    placements.push({ id: item.id, word: item.word, cells });
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return {
    size,
    grid: grid.map((row) =>
      row.map((letter) => letter ?? alphabet[Math.floor(random() * alphabet.length)]!),
    ),
    placements,
  };
}

type RawCrosswordEntry = {
  id: string;
  answer: string;
  letters: string;
  clue: string;
  direction: "across" | "down";
  row: number;
  col: number;
};

function rawEntryCells(entry: RawCrosswordEntry): Array<{ row: number; col: number }> {
  return Array.from({ length: entry.letters.length }, (_, offset) => ({
    row: entry.row + (entry.direction === "down" ? offset : 0),
    col: entry.col + (entry.direction === "across" ? offset : 0),
  }));
}

export function buildCrossword(
  values: Array<{ id: string; answer: string; clue: string }>,
): CrosswordPuzzle {
  const words = values
    .map((entry) => ({ ...entry, letters: puzzleLetters(entry.answer) }))
    .filter((entry) => entry.letters.length >= 2)
    .sort((a, b) => b.letters.length - a.letters.length);
  if (words.length === 0) return { rows: 0, cols: 0, cells: [], entries: [] };

  const occupied = new Map<string, string>();
  const placed: RawCrosswordEntry[] = [];
  const put = (entry: RawCrosswordEntry) => {
    placed.push(entry);
    rawEntryCells(entry).forEach((cell, index) => {
      occupied.set(`${cell.row},${cell.col}`, entry.letters[index]!);
    });
  };
  put({ ...words[0]!, direction: "across", row: 0, col: 0 });

  for (const word of words.slice(1)) {
    type Candidate = RawCrosswordEntry & { intersections: number; area: number };
    const candidates: Candidate[] = [];
    for (const existing of placed) {
      const direction = existing.direction === "across" ? "down" : "across";
      for (let ownIndex = 0; ownIndex < word.letters.length; ownIndex += 1) {
        for (let existingIndex = 0; existingIndex < existing.letters.length; existingIndex += 1) {
          if (word.letters[ownIndex] !== existing.letters[existingIndex]) continue;
          const crossing = rawEntryCells(existing)[existingIndex]!;
          const row = crossing.row - (direction === "down" ? ownIndex : 0);
          const col = crossing.col - (direction === "across" ? ownIndex : 0);
          const candidate: RawCrosswordEntry = { ...word, direction, row, col };
          let intersections = 0;
          let valid = true;
          for (const [index, cell] of rawEntryCells(candidate).entries()) {
            const current = occupied.get(`${cell.row},${cell.col}`);
            if (current && current !== word.letters[index]) {
              valid = false;
              break;
            }
            if (current === word.letters[index]) intersections += 1;
          }
          if (!valid || intersections < 1) continue;
          const allCells = [...occupied.keys()].map((key) => key.split(",").map(Number));
          const candidateCells = rawEntryCells(candidate);
          const rows = [...allCells.map(([r]) => r!), ...candidateCells.map((c) => c.row)];
          const cols = [...allCells.map(([, c]) => c!), ...candidateCells.map((c) => c.col)];
          const area =
            (Math.max(...rows) - Math.min(...rows) + 1) *
            (Math.max(...cols) - Math.min(...cols) + 1);
          candidates.push({ ...candidate, intersections, area });
        }
      }
    }
    const best = candidates.sort(
      (a, b) => b.intersections - a.intersections || a.area - b.area,
    )[0];
    if (best) {
      put(best);
      continue;
    }
    // A list can contain words with no shared letters. Keep every teacher-selected word
    // playable by placing a clearly separated across entry below the connected section.
    const maxRow = Math.max(...placed.flatMap((entry) => rawEntryCells(entry).map((c) => c.row)));
    put({ ...word, direction: "across", row: maxRow + 2, col: 0 });
  }

  const rawCells = placed.flatMap(rawEntryCells);
  const minRow = Math.min(...rawCells.map((cell) => cell.row));
  const minCol = Math.min(...rawCells.map((cell) => cell.col));
  const normalized = placed.map((entry) => ({
    ...entry,
    row: entry.row - minRow,
    col: entry.col - minCol,
  }));
  const starts = [...new Map(normalized.map((entry) => [`${entry.row},${entry.col}`, entry])).keys()]
    .map((key) => key.split(",").map(Number) as [number, number])
    .sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB);
  const numbers = new Map(starts.map(([row, col], index) => [`${row},${col}`, index + 1]));
  const cellMap = new Map<string, CrosswordCell>();
  const entries: CrosswordPlacedEntry[] = normalized.map((entry) => {
    const cells = rawEntryCells(entry);
    const number = numbers.get(`${entry.row},${entry.col}`)!;
    cells.forEach((cell, index) => {
      const key = `${cell.row},${cell.col}`;
      cellMap.set(key, {
        row: cell.row,
        col: cell.col,
        letter: entry.letters[index]!,
        number: numbers.get(key),
      });
    });
    return { ...entry, number, cells };
  });
  const cells = [...cellMap.values()];
  return {
    rows: Math.max(...cells.map((cell) => cell.row)) + 1,
    cols: Math.max(...cells.map((cell) => cell.col)) + 1,
    cells,
    entries,
  };
}

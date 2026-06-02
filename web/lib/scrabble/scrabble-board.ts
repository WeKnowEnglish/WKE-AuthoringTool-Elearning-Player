export const BOARD_SIZE = 11;
export const CENTER_ROW = 5;
export const CENTER_COL = 5;

export type Direction = "across" | "down";

export type BoardCell = string | null;
export type BoardState = BoardCell[][];

export type WordPlacement = {
  row: number;
  col: number;
  direction: Direction;
  word: string;
};

export function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): BoardCell => null),
  );
}

export function isBoardEmpty(board: BoardState): boolean {
  return board.every((row) => row.every((cell) => cell == null));
}

export function cellAt(board: BoardState, row: number, col: number): BoardCell {
  if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
  return board[row]![col]!;
}

export function placementCells(
  placement: WordPlacement,
): { row: number; col: number; letter: string }[] {
  const word = placement.word.toUpperCase();
  const cells: { row: number; col: number; letter: string }[] = [];
  for (let i = 0; i < word.length; i++) {
    const row =
      placement.direction === "down" ? placement.row + i : placement.row;
    const col =
      placement.direction === "across" ? placement.col + i : placement.col;
    cells.push({ row, col, letter: word[i]! });
  }
  return cells;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE;
}

/** Letters that must be drawn from the rack (empty cells in the placement). */
export function rackLettersNeeded(
  board: BoardState,
  placement: WordPlacement,
): string[] {
  const needed: string[] = [];
  for (const { row, col, letter } of placementCells(placement)) {
    if (!inBounds(row, col)) return [];
    const existing = cellAt(board, row, col);
    if (existing == null) needed.push(letter);
    else if (existing !== letter) return [];
  }
  return needed;
}

function hasAdjacentTile(board: BoardState, row: number, col: number): boolean {
  const neighbors = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];
  return neighbors.some(([r, c]) => inBounds(r, c) && cellAt(board, r, c) != null);
}

function placementTouchesExisting(board: BoardState, placement: WordPlacement): boolean {
  return placementCells(placement).some(({ row, col }) => {
    const existing = cellAt(board, row, col);
    if (existing != null) return true;
    return hasAdjacentTile(board, row, col);
  });
}

function placementUsesCenter(placement: WordPlacement): boolean {
  return placementCells(placement).some(
    ({ row, col }) => row === CENTER_ROW && col === CENTER_COL,
  );
}

function readWordAt(
  board: BoardState,
  row: number,
  col: number,
  direction: Direction,
): string {
  if (cellAt(board, row, col) == null) return "";

  if (direction === "across") {
    let startCol = col;
    while (startCol > 0 && cellAt(board, row, startCol - 1) != null) startCol--;
    let word = "";
    for (let c = startCol; c < BOARD_SIZE && cellAt(board, row, c) != null; c++) {
      word += cellAt(board, row, c)!;
    }
    return word;
  }

  let startRow = row;
  while (startRow > 0 && cellAt(board, startRow - 1, col) != null) startRow--;
  let word = "";
  for (let r = startRow; r < BOARD_SIZE && cellAt(board, r, col) != null; r++) {
    word += cellAt(board, r, col)!;
  }
  return word;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => [...row]);
}

export function applyPlacement(board: BoardState, placement: WordPlacement): BoardState {
  const next = cloneBoard(board);
  for (const { row, col, letter } of placementCells(placement)) {
    next[row]![col] = letter;
  }
  return next;
}

export type PlacementError =
  | "out_of_bounds"
  | "empty_word"
  | "no_center"
  | "not_connected"
  | "conflict"
  | "no_new_tiles";

export function validatePlacementStructure(
  board: BoardState,
  placement: WordPlacement,
): PlacementError | null {
  const word = placement.word.trim();
  if (word.length < 2) return "empty_word";

  const cells = placementCells({ ...placement, word });
  if (cells.some(({ row, col }) => !inBounds(row, col))) return "out_of_bounds";

  let newTileCount = 0;
  for (const { row, col, letter } of cells) {
    const existing = cellAt(board, row, col);
    if (existing != null && existing !== letter) return "conflict";
    if (existing == null) newTileCount++;
  }
  if (newTileCount === 0) return "no_new_tiles";

  const empty = isBoardEmpty(board);
  if (empty) {
    if (!placementUsesCenter({ ...placement, word })) return "no_center";
    return null;
  }

  if (!placementTouchesExisting(board, { ...placement, word })) {
    return "not_connected";
  }

  return null;
}

/** Collect all words formed (main + perpendicular) after hypothetical placement. */
export function wordsFormedByPlacement(
  board: BoardState,
  placement: WordPlacement,
): string[] {
  const temp = applyPlacement(board, placement);
  const words = new Set<string>();

  for (const { row, col } of placementCells(placement)) {
    const across = readWordAt(temp, row, col, "across");
    if (across.length >= 2) words.add(across);
    const down = readWordAt(temp, row, col, "down");
    if (down.length >= 2) words.add(down);
  }

  return [...words];
}

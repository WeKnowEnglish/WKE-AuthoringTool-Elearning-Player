import {
  applyPlacement,
  cellAt,
  isBoardEmpty,
  rackLettersNeeded,
  validatePlacementStructure,
  wordsFormedByPlacement,
  type BoardState,
  type Direction,
  type WordPlacement,
} from "@/lib/scrabble/scrabble-board";
import { rackCanSupply } from "@/lib/scrabble/scrabble-letters";
import {
  allWordsValid,
  isValidWord,
  KID_SCRABBLE_WORDS,
} from "@/lib/scrabble/scrabble-words";

/** Short words pets prefer for crossing plays. */
const PET_PLAY_WORDS = [...KID_SCRABBLE_WORDS].filter((w) => w.length <= 4);

function tryPlacement(
  board: BoardState,
  placement: WordPlacement,
  petRack: string[],
): WordPlacement | null {
  const structureError = validatePlacementStructure(board, placement);
  if (structureError) return null;

  const needed = rackLettersNeeded(board, placement);
  if (!rackCanSupply(petRack, needed)) return null;

  const formed = wordsFormedByPlacement(board, placement);
  if (!allWordsValid(formed)) return null;

  return placement;
}

function anchorCandidates(board: BoardState): {
  row: number;
  col: number;
  letter: string;
  direction: Direction;
}[] {
  const anchors: {
    row: number;
    col: number;
    letter: string;
    direction: Direction;
  }[] = [];

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row]!.length; col++) {
      const letter = cellAt(board, row, col);
      if (letter == null) continue;

      for (const direction of ["across", "down"] as Direction[]) {
        const dr = direction === "down" ? 1 : 0;
        const dc = direction === "across" ? 1 : 0;
        const prevR = row - dr;
        const prevC = col - dc;
        if (cellAt(board, prevR, prevC) != null) continue;
        anchors.push({ row, col, letter, direction });
      }
    }
  }

  return anchors;
}

function buildPlacementAtAnchor(
  board: BoardState,
  word: string,
  anchor: { row: number; col: number; letter: string; direction: Direction },
  letterIndexInWord: number,
): WordPlacement {
  const upper = word.toUpperCase();
  const dr = anchor.direction === "down" ? 1 : 0;
  const dc = anchor.direction === "across" ? 1 : 0;
  const startRow = anchor.row - dr * letterIndexInWord;
  const startCol = anchor.col - dc * letterIndexInWord;
  return {
    row: startRow,
    col: startCol,
    direction: anchor.direction,
    word: upper,
  };
}

export function pickPetPlay(
  board: BoardState,
  petRack: string[],
  random: () => number = Math.random,
): WordPlacement | null {
  if (isBoardEmpty(board)) {
    const starters = PET_PLAY_WORDS.filter((w) => w.length >= 2 && w.length <= 4);
    const word = starters[Math.floor(random() * starters.length)] ?? "CAT";
    const col = Math.max(0, 5 - Math.floor(word.length / 2));
    const placement: WordPlacement = {
      row: 5,
      col,
      direction: "across",
      word,
    };
    return tryPlacement(board, placement, petRack) ? placement : null;
  }

  const anchors = anchorCandidates(board);
  const shuffled = [...PET_PLAY_WORDS].sort(() => random() - 0.5);

  for (const word of shuffled) {
    if (!isValidWord(word)) continue;
    const upper = word.toUpperCase();
    for (const anchor of anchors) {
      for (let i = 0; i < upper.length; i++) {
        if (upper[i] !== anchor.letter) continue;
        const placement = buildPlacementAtAnchor(board, upper, anchor, i);
        const ok = tryPlacement(board, placement, petRack);
        if (ok) return ok;
      }
    }
  }

  return null;
}

export function applyPetPlay(
  board: BoardState,
  placement: WordPlacement,
): BoardState {
  return applyPlacement(board, placement);
}

/** Pet rack letters consumed by a play. */
export function petRackLettersUsed(
  board: BoardState,
  placement: WordPlacement,
): string[] {
  return rackLettersNeeded(board, placement);
}

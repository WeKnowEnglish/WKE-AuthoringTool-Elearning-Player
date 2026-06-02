"use client";

import { clsx } from "clsx";
import Image from "next/image";
import {
  BOARD_SIZE,
  CENTER_COL,
  CENTER_ROW,
  cellAt,
  isBoardEmpty,
  placementCells,
  type BoardState,
  type Direction,
  type WordPlacement,
} from "@/lib/scrabble/scrabble-board";
import {
  SCRABBLE_BOARD_CELL_URL,
  SCRABBLE_BOARD_CENTER_URL,
  SCRABBLE_TILE_FACE_URL,
} from "@/lib/scrabble/scrabble-assets";

type Props = {
  board: BoardState;
  direction: Direction;
  placementStart: { row: number; col: number } | null;
  stagingWord: string;
  onCellClick: (row: number, col: number) => void;
};

function previewLetters(
  board: BoardState,
  start: { row: number; col: number } | null,
  direction: Direction,
  word: string,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!start || word.length === 0) return map;
  const placement: WordPlacement = {
    row: start.row,
    col: start.col,
    direction,
    word: word.toUpperCase(),
  };
  for (const { row, col, letter } of placementCells(placement)) {
    if (cellAt(board, row, col) == null) {
      map.set(`${row},${col}`, letter);
    }
  }
  return map;
}

export function PetScrabbleBoard({
  board,
  direction,
  placementStart,
  stagingWord,
  onCellClick,
}: Props) {
  const preview = previewLetters(board, placementStart, direction, stagingWord);
  const empty = isBoardEmpty(board);

  return (
    <div className="mx-auto w-full max-w-[min(100%,18rem)]">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: BOARD_SIZE }, (_, row) =>
          Array.from({ length: BOARD_SIZE }, (_, col) => {
            const key = `${row},${col}`;
            const placed = cellAt(board, row, col);
            const isCenter = row === CENTER_ROW && col === CENTER_COL;
            const isPreview = preview.has(key);
            const previewLetter = preview.get(key);
            const showLetter = placed ?? previewLetter;

            return (
              <button
                key={key}
                type="button"
                className={clsx(
                  "relative aspect-square w-full min-w-0 rounded-sm border border-kid-ink/20 transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600",
                  placementStart?.row === row && placementStart?.col === col &&
                    "ring-2 ring-sky-500",
                  isPreview && !placed && "bg-amber-100/90",
                )}
                onClick={() => onCellClick(row, col)}
                aria-label={
                  showLetter ?
                    `Cell ${row + 1}, ${col + 1}, letter ${showLetter}`
                  : `Empty cell ${row + 1}, ${col + 1}`
                }
              >
                <Image
                  src={isCenter && !placed ? SCRABBLE_BOARD_CENTER_URL : SCRABBLE_BOARD_CELL_URL}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="24px"
                />
                {showLetter ?
                  <span
                    className={clsx(
                      "absolute inset-0 flex items-center justify-center text-[0.55rem] font-black sm:text-[0.65rem]",
                      placed ? "text-kid-ink" : "text-amber-900",
                    )}
                  >
                    <Image
                      src={SCRABBLE_TILE_FACE_URL}
                      alt=""
                      fill
                      className="object-contain p-px"
                      sizes="24px"
                    />
                    <span className="relative z-10">{showLetter}</span>
                  </span>
                : null}
              </button>
            );
          }),
        )}
      </div>
      {empty ?
        <p className="mt-1 text-center text-[10px] font-semibold text-kid-ink/70">
          Tap where your word starts — first word must touch the ★
        </p>
      : null}
    </div>
  );
}

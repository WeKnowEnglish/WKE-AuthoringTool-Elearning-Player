"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { buildWordSearch } from "@/lib/word-games/puzzles";
import {
  GuideBlock,
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
  type NavProps,
} from "./shared";

type Parsed = Extract<ScreenPayload, { type: "interaction"; subtype: "wordsearch" }>;
type Cell = { row: number; col: number };

function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

function lineBetween(start: Cell, end: Cell): Cell[] | null {
  const rowDelta = end.row - start.row;
  const colDelta = end.col - start.col;
  if (rowDelta !== 0 && colDelta !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) {
    return null;
  }
  const length = Math.max(Math.abs(rowDelta), Math.abs(colDelta)) + 1;
  const rowStep = Math.sign(rowDelta);
  const colStep = Math.sign(colDelta);
  return Array.from({ length }, (_, index) => ({
    row: start.row + rowStep * index,
    col: start.col + colStep * index,
  }));
}

function samePath(left: Cell[], right: Cell[]): boolean {
  if (left.length !== right.length) return false;
  const forward = left.every((cell, index) => cellKey(cell) === cellKey(right[index]!));
  if (forward) return true;
  return left.every(
    (cell, index) => cellKey(cell) === cellKey(right[right.length - index - 1]!),
  );
}
export function WordSearchView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
}: { parsed: Parsed; muted: boolean; passed: boolean; onPass: () => void; onWrong: () => void } & NavProps) {
  const stageFooter = isStageFooterNav(controlsPlacement);
  const puzzle = useMemo(
    () =>
      buildWordSearch({
        words: parsed.words,
        size: parsed.grid_size,
        allowBackwards: parsed.allow_backwards,
        seed: parsed.quiz_group_id ?? parsed.words.map((word) => word.id).join("|"),
      }),
    [parsed.allow_backwards, parsed.grid_size, parsed.quiz_group_id, parsed.words],
  );
  const [start, setStart] = useState<Cell | null>(null);
  const [foundIds, setFoundIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("Tap the first and last letter of a word.");
  const foundCells = useMemo(() => {
    const keys = new Set<string>();
    puzzle.placements.forEach((placement) => {
      if (foundIds.has(placement.id)) placement.cells.forEach((cell) => keys.add(cellKey(cell)));
    });
    return keys;
  }, [foundIds, puzzle.placements]);

  function choose(cell: Cell) {
    if (passed) return;
    playSfx("tap", muted);
    if (!start) {
      setStart(cell);
      setMessage("Now tap the last letter.");
      return;
    }
    const path = lineBetween(start, cell);
    setStart(null);
    const match = path
      ? puzzle.placements.find(
          (placement) => !foundIds.has(placement.id) && samePath(path, placement.cells),
        )
      : undefined;
    if (!match) {
      onWrong();
      setMessage("That line is not one of the words. Try again.");
      return;
    }
    const next = new Set(foundIds);
    next.add(match.id);
    setFoundIds(next);
    playSfx("correct", muted);
    if (next.size === puzzle.placements.length) {
      setMessage("You found every word!");
      onPass();
    } else {
      setMessage(`Found ${match.word}! Keep looking.`);
    }
  }

  return (
    <div className={interactionLessonShellClass(controlsPlacement)}>
      <KidPanel className={clsx(stageFooter && "flex min-h-0 flex-1 flex-col overflow-hidden !p-3 sm:!p-4")}>
        <div className="shrink-0 text-center">
          <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">{parsed.prompt}</h2>
          <p className="mt-1 text-sm font-bold text-kid-ink/65">{message}</p>
        </div>
        <div className="mt-3 flex min-h-0 flex-1 flex-col items-center gap-3 lg:flex-row lg:justify-center">
          <div
            className="grid aspect-square w-full max-w-[min(68dvh,38rem)] gap-0.5 rounded-2xl border-4 border-kid-ink bg-kid-ink p-1 shadow-lg"
            style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}
            aria-label="Word search grid"
          >
            {puzzle.grid.flatMap((row, rowIndex) =>
              row.map((letter, colIndex) => {
                const cell = { row: rowIndex, col: colIndex };
                const key = cellKey(cell);
                const selected = start && cellKey(start) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => choose(cell)}
                    disabled={passed}
                    aria-pressed={foundCells.has(key)}
                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${letter}`}
                    className={clsx(
                      "flex aspect-square min-w-0 items-center justify-center rounded-[0.3rem] bg-white text-[clamp(0.55rem,2.2cqw,1.25rem)] font-black uppercase text-kid-ink transition",
                      foundCells.has(key) &&
                        "!bg-emerald-300 !text-emerald-950 ring-2 ring-inset ring-emerald-700",
                      selected && "bg-kid-cta ring-2 ring-white",
                    )}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>
          <ul className="grid max-h-44 w-full max-w-xl grid-cols-2 gap-1.5 overflow-y-auto rounded-xl bg-kid-surface-muted p-2 text-sm font-extrabold sm:grid-cols-3 lg:max-h-full lg:w-52 lg:grid-cols-1">
            {puzzle.placements.map((placement) => (
              <li
                key={placement.id}
                className={clsx(
                  "rounded-lg bg-white px-3 py-1.5 text-kid-ink",
                  foundIds.has(placement.id) &&
                    "!bg-emerald-200 text-emerald-900 ring-2 ring-inset ring-emerald-600 line-through",
                )}
              >
                {placement.word}
              </li>
            ))}
          </ul>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionShellNav
        showBack={showBack}
        onBack={onBack}
        passed={passed}
        onNext={onNext}
        controlsPlacement={controlsPlacement}
      />
    </div>
  );
}

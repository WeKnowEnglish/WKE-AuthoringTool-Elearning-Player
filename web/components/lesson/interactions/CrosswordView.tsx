"use client";

import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { buildCrossword } from "@/lib/word-games/puzzles";
import {
  GuideBlock,
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
  type NavProps,
} from "./shared";

type Parsed = Extract<ScreenPayload, { type: "interaction"; subtype: "crossword" }>;

export function CrosswordView({
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
  const puzzle = useMemo(() => buildCrossword(parsed.entries), [parsed.entries]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [wrongCells, setWrongCells] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("Use the clues to complete the puzzle.");
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const cellByKey = new Map(puzzle.cells.map((cell) => [`${cell.row},${cell.col}`, cell]));

  function check() {
    if (passed) return;
    playSfx("tap", muted);
    const wrong = new Set<string>();
    puzzle.cells.forEach((cell) => {
      const key = `${cell.row},${cell.col}`;
      if ((answers[key] ?? "").toLocaleUpperCase() !== cell.letter) wrong.add(key);
    });
    setWrongCells(wrong);
    if (wrong.size === 0) {
      playSfx("correct", muted);
      setMessage("Crossword complete — great vocabulary work!");
      onPass();
    } else {
      onWrong();
      setMessage("Check the highlighted squares and try again.");
    }
  }

  function focusEntry(entryId: string) {
    const entry = puzzle.entries.find((item) => item.id === entryId);
    const first = entry?.cells.find((cell) => !answers[`${cell.row},${cell.col}`]);
    const target = first ?? entry?.cells[0];
    if (target) refs.current[`${target.row},${target.col}`]?.focus();
  }

  return (
    <div className={interactionLessonShellClass(controlsPlacement)}>
      <KidPanel className={clsx(stageFooter && "flex min-h-0 flex-1 flex-col overflow-hidden !p-3 sm:!p-4")}>
        <div className="shrink-0 text-center">
          <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">{parsed.prompt}</h2>
          <p className="mt-1 text-sm font-bold text-kid-ink/65">{message}</p>
        </div>
        <div className="mt-3 grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-h-0 items-center justify-center overflow-auto rounded-xl bg-kid-surface-muted p-2">
            <div
              className="grid w-full max-w-[min(70dvh,42rem)] gap-0.5 bg-kid-ink p-1"
              style={{
                gridTemplateColumns: `repeat(${puzzle.cols}, minmax(1.35rem, 1fr))`,
                gridTemplateRows: `repeat(${puzzle.rows}, minmax(1.35rem, 1fr))`,
                aspectRatio: `${Math.max(1, puzzle.cols)} / ${Math.max(1, puzzle.rows)}`,
              }}
              aria-label="Crossword grid"
            >
              {Array.from({ length: puzzle.rows * puzzle.cols }, (_, index) => {
                const row = Math.floor(index / puzzle.cols);
                const col = index % puzzle.cols;
                const key = `${row},${col}`;
                const cell = cellByKey.get(key);
                if (!cell) return <span key={key} className="bg-kid-ink" aria-hidden />;
                return (
                  <label key={key} className="relative min-h-0 min-w-0 bg-white">
                    {cell.number ? (
                      <span className="pointer-events-none absolute left-0.5 top-0 text-[clamp(0.4rem,1cqw,0.65rem)] font-bold text-kid-ink/60">
                        {cell.number}
                      </span>
                    ) : null}
                    <input
                      ref={(element) => { refs.current[key] = element; }}
                      value={answers[key] ?? ""}
                      maxLength={1}
                      disabled={passed}
                      aria-label={`Crossword square row ${row + 1}, column ${col + 1}`}
                      onChange={(event) => {
                        const value = (event.target.value.match(/[A-Za-z]/)?.[0] ?? "").toUpperCase();
                        setAnswers((current) => ({ ...current, [key]: value }));
                        setWrongCells((current) => {
                          const next = new Set(current);
                          next.delete(key);
                          return next;
                        });
                      }}
                      className={clsx(
                        "h-full w-full bg-transparent pt-1 text-center text-[clamp(0.7rem,2.6cqw,1.5rem)] font-black uppercase text-kid-ink outline-none focus:bg-kid-cta",
                        wrongCells.has(key) && "bg-rose-100 text-rose-800",
                        passed && "bg-emerald-100 text-emerald-900",
                      )}
                    />
                  </label>
                );
              })}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto rounded-xl border-2 border-kid-ink/15 bg-white p-3">
            {(["across", "down"] as const).map((direction) => {
              const entries = puzzle.entries.filter((entry) => entry.direction === direction);
              if (entries.length === 0) return null;
              return (
                <section key={direction} className="mb-3 last:mb-0">
                  <h3 className="text-sm font-black uppercase tracking-wide text-kid-ink/60">
                    {direction}
                  </h3>
                  <ol className="mt-1 space-y-1.5">
                    {entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => focusEntry(entry.id)}
                          className="w-full rounded-lg px-2 py-1 text-left text-sm font-bold text-kid-ink hover:bg-kid-surface-muted"
                        >
                          <span className="mr-1 font-black">{entry.number}.</span> {entry.clue}
                          <span className="ml-1 text-xs text-kid-ink/50">({entry.answer.match(/[A-Za-z]/g)?.length ?? 0})</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex shrink-0 justify-center">
          <KidButton type="button" disabled={passed} onClick={check}>Check crossword</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionShellNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} controlsPlacement={controlsPlacement} />
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { buildCrossword } from "@/lib/word-games/puzzles";
import type { CrosswordPlacedEntry } from "@/lib/word-games/puzzles";
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
  const [activeEntryId, setActiveEntryId] = useState<string | null>(
    () => puzzle.entries[0]?.id ?? null,
  );
  const [lockedEntryId, setLockedEntryId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const clueRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cellByKey = new Map(puzzle.cells.map((cell) => [`${cell.row},${cell.col}`, cell]));
  const entriesByCell = useMemo(() => {
    const result = new Map<string, CrosswordPlacedEntry[]>();
    puzzle.entries.forEach((entry) => {
      entry.cells.forEach((cell) => {
        const key = `${cell.row},${cell.col}`;
        result.set(key, [...(result.get(key) ?? []), entry]);
      });
    });
    return result;
  }, [puzzle.entries]);
  const activeEntry =
    puzzle.entries.find((entry) => entry.id === activeEntryId) ?? null;
  const activeCellKeys = new Set(
    activeEntry?.cells.map((cell) => `${cell.row},${cell.col}`) ?? [],
  );

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

  function focusCell(key: string) {
    const input = refs.current[key];
    input?.focus();
    input?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function focusEntry(entryId: string, lock = true) {
    const entry = puzzle.entries.find((item) => item.id === entryId);
    if (!entry) return;
    setActiveEntryId(entry.id);
    if (lock) setLockedEntryId(entry.id);
    const first = entry?.cells.find((cell) => !answers[`${cell.row},${cell.col}`]);
    const target = first ?? entry?.cells[0];
    if (target) {
      window.requestAnimationFrame(() =>
        focusCell(`${target.row},${target.col}`),
      );
    }
    setMessage(
      `${entry.number} ${entry.direction} selected — typing stays on this clue.`,
    );
  }

  function chooseEntryForCell(key: string): CrosswordPlacedEntry | null {
    const entries = entriesByCell.get(key) ?? [];
    if (entries.length === 0) return null;
    const locked = entries.find((entry) => entry.id === lockedEntryId);
    if (locked) return locked;
    const active = entries.find((entry) => entry.id === activeEntryId);
    if (active) return active;
    const preferredDirection = activeEntry?.direction ?? "across";
    return (
      entries.find((entry) => entry.direction === preferredDirection) ?? entries[0]!
    );
  }

  function activateCell(key: string) {
    const entry = chooseEntryForCell(key);
    if (!entry) return;
    if (lockedEntryId && lockedEntryId !== entry.id) setLockedEntryId(null);
    setActiveEntryId(entry.id);
  }

  function toggleCellDirection(key: string) {
    const entries = entriesByCell.get(key) ?? [];
    if (entries.length === 0) return;
    const current = entries.find((entry) => entry.id === activeEntryId);
    const next =
      entries.length > 1
        ? entries.find((entry) => entry.direction !== current?.direction) ?? entries[0]!
        : entries[0]!;
    setActiveEntryId(next.id);
    setLockedEntryId(next.id);
    clueRefs.current[next.id]?.scrollIntoView({ block: "nearest" });
    setMessage(`${next.number} ${next.direction} selected.`);
  }

  function advanceFromCell(key: string) {
    const entry = chooseEntryForCell(key);
    if (!entry) return;
    setActiveEntryId(entry.id);
    const index = entry.cells.findIndex(
      (cell) => `${cell.row},${cell.col}` === key,
    );
    const next = entry.cells[index + 1];
    if (next) focusCell(`${next.row},${next.col}`);
  }

  function moveBackFromCell(key: string) {
    const entry = chooseEntryForCell(key);
    if (!entry) return;
    const index = entry.cells.findIndex(
      (cell) => `${cell.row},${cell.col}` === key,
    );
    const previous = entry.cells[index - 1];
    if (previous) focusCell(`${previous.row},${previous.col}`);
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
                  <label
                    key={key}
                    className={clsx(
                      "relative min-h-0 min-w-0 bg-white",
                      activeCellKeys.has(key) && "z-[1] ring-2 ring-inset ring-sky-500",
                    )}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      toggleCellDirection(key);
                    }}
                    title={
                      (entriesByCell.get(key)?.length ?? 0) > 1
                        ? "Double-click to switch across/down"
                        : undefined
                    }
                  >
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
                      onFocus={(event) => {
                        event.currentTarget.select();
                        activateCell(key);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !answers[key]) {
                          event.preventDefault();
                          moveBackFromCell(key);
                        }
                      }}
                      onChange={(event) => {
                        const value = (event.target.value.match(/[A-Za-z]/)?.[0] ?? "").toUpperCase();
                        setAnswers((current) => ({ ...current, [key]: value }));
                        setWrongCells((current) => {
                          const next = new Set(current);
                          next.delete(key);
                          return next;
                        });
                        if (value) advanceFromCell(key);
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
            <p className="mb-3 rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-bold leading-snug text-sky-900">
              Click a clue to keep typing on that word. Double-click a crossing square
              to switch across/down.
            </p>
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
                          ref={(element) => {
                            clueRefs.current[entry.id] = element;
                          }}
                          type="button"
                          onClick={() => focusEntry(entry.id)}
                          aria-pressed={activeEntryId === entry.id}
                          className={clsx(
                            "w-full rounded-lg border px-2 py-1 text-left text-sm font-bold text-kid-ink transition hover:bg-kid-surface-muted",
                            activeEntryId === entry.id
                              ? "border-sky-400 bg-sky-100"
                              : "border-transparent",
                          )}
                        >
                          <span className="mr-1 font-black">{entry.number}.</span> {entry.clue}
                          <span className="ml-1 text-xs text-kid-ink/50">({entry.answer.match(/[A-Za-z]/g)?.length ?? 0})</span>
                          {lockedEntryId === entry.id ? (
                            <span className="ml-1 rounded bg-sky-700 px-1 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                              {entry.direction} locked
                            </span>
                          ) : null}
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

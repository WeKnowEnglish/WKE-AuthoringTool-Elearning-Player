"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  canAddCellToSelection,
  createLetterGridSession,
  EARN_SEEDS_MIN_WORD_LENGTH,
  type LetterGridSession,
  trySubmitEarnSeedsWord,
  wordFromCellIndices,
} from "@/lib/garden/earn-seeds-grid";
import type { GardenSnapshotV1 } from "@/lib/garden/types";

type Props = {
  open: boolean;
  muted: boolean;
  snapshot: GardenSnapshotV1;
  onSnapshotChange: (snapshot: GardenSnapshotV1) => void;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

const ERROR_MESSAGES = {
  empty: "Tap letters to build a word first.",
  duplicate_cell: "You already used that letter in this word.",
  too_short: `Words must be at least ${EARN_SEEDS_MIN_WORD_LENGTH} letters.`,
  too_long: "That word is too long for your spelling level. Try a shorter word!",
  not_a_word: "That is not in our kid dictionary. Check the spelling and try again!",
  already_found: "You already found that word on this grid. Try a new one!",
} as const;

const COMPACT_BTN =
  "!min-h-9 !min-w-0 !px-2 !py-1.5 !text-xs sm:!min-h-10 sm:!text-sm";

export function GardenEarnSeedsOverlay({
  open,
  muted,
  snapshot,
  onSnapshotChange,
  onSuccess,
  onClose,
}: Props) {
  const [session, setSession] = useState<LetterGridSession>(() => createLetterGridSession());
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const stagingWord = useMemo(
    () => wordFromCellIndices(session.letters, selectedIndices) ?? "",
    [session.letters, selectedIndices],
  );

  const statusMessage = successMessage ?? errorMessage;

  const resetRoundUi = useCallback(() => {
    setSelectedIndices([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const newGrid = useCallback(() => {
    setSession(createLetterGridSession());
    resetRoundUi();
  }, [resetRoundUi]);

  useEffect(() => {
    if (!open) return;
    setSession(createLetterGridSession());
    resetRoundUi();
  }, [open, resetRoundUi]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!successMessage || !open) return;
    const id = window.setTimeout(() => setSuccessMessage(null), 2200);
    return () => window.clearTimeout(id);
  }, [successMessage, open]);

  if (!open) return null;

  function onCellTap(index: number) {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!canAddCellToSelection(selectedIndices, index)) return;
    setSelectedIndices((prev) => [...prev, index]);
  }

  function onClear() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedIndices([]);
  }

  function onBackspace() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedIndices((prev) => prev.slice(0, -1));
  }

  function onSubmit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    const result = trySubmitEarnSeedsWord(snapshot, session, selectedIndices);
    if (!result.ok) {
      setErrorMessage(ERROR_MESSAGES[result.reason]);
      return;
    }

    playSfx("correct", muted);
    onSnapshotChange(result.snapshot);
    setSession(result.session);
    setSelectedIndices([]);
    const message = `+1 seed for ${result.word}!`;
    setSuccessMessage(message);
    onSuccess(`You earned 1 seed for ${result.word}!`);
  }

  return (
    <div
      className="fixed inset-0 z-[82] flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="earn-seeds-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-0.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-4 border-kid-ink bg-gradient-to-b from-[#dff4ff] to-[#f8fdff] shadow-xl sm:max-h-[min(92dvh,34rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-kid-ink/15 px-3 py-2">
          <div className="min-w-0">
            <h2 id="earn-seeds-title" className="text-base font-extrabold text-kid-ink sm:text-lg">
              Earn Seeds
            </h2>
            <p className="text-[0.65rem] font-semibold leading-tight text-kid-ink/70 sm:text-xs">
              Tap letters in any order · 1 seed per word
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border-2 border-kid-ink bg-white px-2 py-0.5 text-sm font-extrabold text-kid-ink hover:bg-kid-surface-muted"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <div
            className="flex items-center justify-between gap-2 rounded-lg border-2 border-kid-ink/20 bg-white/80 px-2.5 py-1.5"
            aria-live="polite"
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-wide text-kid-ink/55">
              Word
            </span>
            <span className="min-w-0 flex-1 truncate text-right text-lg font-extrabold tracking-widest text-kid-ink sm:text-xl">
              {stagingWord || "—"}
            </span>
          </div>

          {statusMessage ?
            <p
              className={clsx(
                "mt-1.5 text-center text-xs font-extrabold leading-snug",
                successMessage ? "text-emerald-700" : "text-red-700",
              )}
            >
              {statusMessage}
            </p>
          : null}

          <div className="mt-2 flex justify-center">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {session.letters.map((letter, index) => {
                const order = selectedIndices.indexOf(index);
                const selected = order >= 0;
                return (
                  <button
                    key={`${session.sessionId}-${index}`}
                    type="button"
                    className={clsx(
                      "relative flex h-10 w-10 items-center justify-center rounded-lg border-2 text-base font-extrabold transition-transform [touch-action:manipulation] sm:h-11 sm:w-11 sm:text-lg",
                      selected ?
                        "border-kid-cta bg-kid-cta text-kid-ink scale-95"
                      : "border-kid-ink bg-white text-kid-ink hover:bg-kid-surface-muted active:scale-95",
                    )}
                    aria-label={`Letter ${letter}${selected ? `, position ${order + 1} in word` : ""}`}
                    onClick={() => onCellTap(index)}
                  >
                    {letter}
                    {selected ?
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-kid-ink bg-white text-[0.55rem] font-extrabold">
                        {order + 1}
                      </span>
                    : null}
                  </button>
                );
              })}
            </div>
          </div>

          {session.foundWords.length > 0 ?
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
              <span className="text-[0.6rem] font-bold uppercase tracking-wide text-kid-ink/55">
                Found
              </span>
              {session.foundWords.map((word) => (
                <span
                  key={word}
                  className="rounded border-2 border-kid-ink bg-white px-1.5 py-px text-[0.65rem] font-extrabold text-kid-ink sm:text-xs"
                >
                  {word}
                </span>
              ))}
            </div>
          : null}
        </div>

        <footer className="shrink-0 space-y-1.5 border-t-2 border-kid-ink/15 px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
            <KidButton type="button" variant="secondary" className={COMPACT_BTN} onClick={onClear}>
              Clear
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              className={COMPACT_BTN}
              disabled={selectedIndices.length === 0}
              onClick={onBackspace}
            >
              Back
            </KidButton>
            <KidButton type="button" variant="secondary" className={COMPACT_BTN} onClick={newGrid}>
              New grid
            </KidButton>
          </div>
          <KidButton
            type="button"
            variant="primary"
            className={clsx(COMPACT_BTN, "!min-h-10 w-full")}
            disabled={stagingWord.length < EARN_SEEDS_MIN_WORD_LENGTH}
            onClick={onSubmit}
          >
            Check word · +1 seed
          </KidButton>
        </footer>
      </div>
    </div>
  );
}

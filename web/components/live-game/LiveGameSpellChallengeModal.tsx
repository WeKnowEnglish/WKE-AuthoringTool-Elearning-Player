"use client";

import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { depositSpellModalTitle } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  applyHint,
  bankKeyForIndex,
  buildSpellingFromSlots,
  createInitialSpellTileState,
  isBankKeyInUse,
  isReadyToSubmit,
  placeLetterFromBank,
  returnLetterToBank,
  type DepositSpellTileState,
} from "@/lib/live-game/modes/english-craft/deposit-spell-tiles";
import type { EnglishCraftDepositSpellClient } from "@/lib/live-game/modes/english-craft/questions-deposit-client";

const HINT_COOLDOWN_MS = 2_000;
const TILE_GAP_PX = 6;
const TILE_MIN_PX = 28;
const TILE_MAX_PX = 44;
const MODAL_MIN_WIDTH_PX = 512;
const MODAL_HORIZONTAL_PADDING_PX = 40;

function spellModalPreferredMaxWidthPx(slotCount: number): number {
  const rowWidth = slotCount * TILE_MAX_PX + Math.max(0, slotCount - 1) * TILE_GAP_PX;
  return Math.max(MODAL_MIN_WIDTH_PX, rowWidth + MODAL_HORIZONTAL_PADDING_PX);
}

const letterTileClass =
  "box-border flex shrink-0 touch-manipulation select-none items-center justify-center rounded-xl border-2 border-kid-ink bg-white font-bold leading-none text-kid-ink shadow-[2px_2px_0_#152668] transition-[transform,background-color] duration-100 hover:bg-sky-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

const letterSlotClass =
  "flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-kid-ink/35 bg-kid-surface-muted p-0.5";

type Props = {
  open: boolean;
  spell: EnglishCraftDepositSpellClient | null;
  resourceType?: LiveGameResourceType;
  tokenStatus?: LiveGameChallengeTokenStatus;
  isSubmitting?: boolean;
  feedback?: "correct" | "incorrect" | null;
  error?: string | null;
  onSubmit: (spelling: string) => void;
  onSkip?: () => void;
  onDropCarry?: () => void;
  onClose: () => void;
};

export function LiveGameSpellChallengeModal({
  open,
  spell,
  resourceType = "wood",
  tokenStatus = "ready",
  isSubmitting = false,
  feedback,
  error,
  onSubmit,
  onSkip,
  onDropCarry,
  onClose,
}: Props) {
  const [tileState, setTileState] = useState<DepositSpellTileState>({ slots: [] });
  const [hintCooldownMs, setHintCooldownMs] = useState(0);
  const [letterTileSizePx, setLetterTileSizePx] = useState<number>(TILE_MAX_PX);
  const letterSlotsRowRef = useRef<HTMLDivElement>(null);

  const spellKey = useMemo(
    () => `${spell?.spellHint ?? ""}:${spell?.slotCount ?? 0}:${spell?.letterBank.join("|") ?? ""}`,
    [spell?.letterBank, spell?.slotCount, spell?.spellHint],
  );

  useEffect(() => {
    if (!open || !spell) {
      setTileState({ slots: [] });
      setHintCooldownMs(0);
      return;
    }
    setTileState(createInitialSpellTileState(spell.slotCount));
    setHintCooldownMs(0);
  }, [open, spellKey, spell]);

  useLayoutEffect(() => {
    const slotCount = spell?.slotCount ?? 0;
    if (!open || slotCount === 0) {
      queueMicrotask(() => setLetterTileSizePx(TILE_MAX_PX));
      return;
    }

    const el = letterSlotsRowRef.current;
    if (!el) return;

    const compute = (): boolean => {
      const width = el.clientWidth;
      if (width <= 0) return false;
      const totalGaps = Math.max(0, slotCount - 1) * TILE_GAP_PX;
      const raw = Math.floor((width - totalGaps) / slotCount);
      const clamped = Math.min(TILE_MAX_PX, Math.max(TILE_MIN_PX, raw));
      queueMicrotask(() => setLetterTileSizePx(clamped));
      return true;
    };

    if (!compute()) {
      requestAnimationFrame(() => {
        compute();
      });
    }

    const observer = new ResizeObserver(() => {
      compute();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, spell?.slotCount, spellKey]);

  const letterTileStyle = useMemo(
    () => ({
      width: letterTileSizePx,
      height: letterTileSizePx,
      fontSize: letterTileSizePx >= 40 ? "1.125rem" : letterTileSizePx >= 32 ? "1rem" : "0.875rem",
    }),
    [letterTileSizePx],
  );

  const modalMaxWidth = spell
    ? `min(calc(100vw - 2rem), ${spellModalPreferredMaxWidthPx(spell.slotCount)}px)`
    : undefined;

  useEffect(() => {
    if (hintCooldownMs <= 0) return;
    const timer = window.setInterval(() => {
      setHintCooldownMs((current) => Math.max(0, current - 100));
    }, 100);
    return () => window.clearInterval(timer);
  }, [hintCooldownMs]);

  const canSubmit =
    spell &&
    tokenStatus === "ready" &&
    !isSubmitting &&
    isReadyToSubmit(tileState, spell.slotCount);

  const canHint =
    spell &&
    tokenStatus === "ready" &&
    !isSubmitting &&
    hintCooldownMs <= 0 &&
    !isReadyToSubmit(tileState, spell.slotCount);

  const canSkip = spell && tokenStatus === "ready" && !isSubmitting && onSkip != null;

  const canDrop = spell && tokenStatus === "ready" && !isSubmitting && onDropCarry != null;

  const handlePlaceLetter = useCallback(
    (bankIndex: number, letter: string) => {
      if (!spell || isSubmitting || tokenStatus !== "ready") return;
      const bankKey = bankKeyForIndex(bankIndex, letter);
      if (isBankKeyInUse(tileState, bankKey)) return;
      setTileState((current) =>
        placeLetterFromBank(current, spell.answerLetters, bankKey, letter),
      );
    },
    [isSubmitting, spell, tileState, tokenStatus],
  );

  const handleReturnLetter = useCallback(
    (slotIndex: number) => {
      if (!spell || isSubmitting || tokenStatus !== "ready") return;
      setTileState((current) => returnLetterToBank(current, slotIndex));
    },
    [isSubmitting, spell, tokenStatus],
  );

  const handleHint = useCallback(() => {
    if (!spell || !canHint) return;
    setTileState((current) => applyHint(current, spell.answerLetters, spell.letterBank));
    setHintCooldownMs(HINT_COOLDOWN_MS);
  }, [canHint, spell]);

  const handleSubmit = useCallback(() => {
    if (!spell || !canSubmit) return;
    onSubmit(buildSpellingFromSlots(tileState));
  }, [canSubmit, onSubmit, spell, tileState]);

  return (
    <AnimatePresence>
      {open && spell ?
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full rounded-2xl border-4 border-kid-ink bg-white p-5 shadow-xl"
            style={modalMaxWidth ? { maxWidth: modalMaxWidth } : undefined}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-game-spell-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-spell-title" className="text-xl font-extrabold text-kid-ink">
                {depositSpellModalTitle(resourceType)}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            <p className="text-sm font-semibold text-kid-ink/70">{spell.storageLabel}</p>
            <p className="mt-2 text-2xl font-semibold leading-snug text-kid-ink">
              Spell the word that means:
            </p>
            <p className="mt-2 text-xl font-bold text-kid-accent">{spell.spellHint}</p>

            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-kid-ink/70">Your spelling</p>
              <div
                ref={letterSlotsRowRef}
                className="flex w-full min-w-0 justify-center overflow-x-auto pb-0.5 [scrollbar-width:thin]"
                aria-label="Answer slots"
              >
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                  {tileState.slots.map((slot, slotIndex) => (
                    <button
                      key={`slot-${slotIndex}`}
                      type="button"
                      disabled={!slot || slot.locked || isSubmitting || tokenStatus !== "ready"}
                      onClick={() => handleReturnLetter(slotIndex)}
                      style={letterTileStyle}
                      className={clsx(
                        letterSlotClass,
                        slot?.locked && "border-emerald-600 bg-emerald-50",
                      )}
                      aria-label={slot ? `Return letter ${slot.char}` : "Empty slot"}
                    >
                      {slot ?
                        <span
                          className={clsx(
                            letterTileClass,
                            "h-full w-full min-h-0 min-w-0",
                            slot.locked && "border-emerald-600 bg-emerald-50 text-emerald-900",
                          )}
                        >
                          {slot.char}
                        </span>
                      : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-kid-ink/70">Letter bank</p>
              <div
                className="flex w-full min-w-0 justify-center overflow-x-auto pb-0.5 [scrollbar-width:thin]"
                aria-label="Letter bank"
              >
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                  {spell.letterBank.map((letter, bankIndex) => {
                    const bankKey = bankKeyForIndex(bankIndex, letter);
                    const used = isBankKeyInUse(tileState, bankKey);
                    return (
                      <button
                        key={bankKey}
                        type="button"
                        disabled={used || isSubmitting || tokenStatus !== "ready"}
                        onClick={() => handlePlaceLetter(bankIndex, letter)}
                        style={letterTileStyle}
                        className={letterTileClass}
                        aria-label={`Letter ${letter}`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {tokenStatus === "pending" ?
              <p className="mt-3 text-sm font-semibold text-kid-ink/70">Connecting...</p>
            : null}
            {isSubmitting && feedback == null ?
              <p className="mt-3 text-sm font-semibold text-kid-ink/70" aria-live="polite">
                Checking...
              </p>
            : null}
            {feedback === "incorrect" ?
              <p className="mt-3 text-sm font-semibold text-red-700">Not quite — try again!</p>
            : null}
            {error ?
              <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
            : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {onDropCarry ?
                <KidButton variant="secondary" disabled={!canDrop} onClick={onDropCarry}>
                  Drop item
                </KidButton>
              : null}
              {onSkip ?
                <KidButton variant="secondary" disabled={!canSkip} onClick={onSkip}>
                  Skip
                </KidButton>
              : null}
              <KidButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
                Cancel
              </KidButton>
              <KidButton variant="secondary" disabled={!canHint} onClick={handleHint}>
                {hintCooldownMs > 0 ?
                  `Hint (${Math.ceil(hintCooldownMs / 1000)}s)`
                : "Hint"}
              </KidButton>
              <KidButton variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
                {isSubmitting ? "Checking..." : "Deposit"}
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}

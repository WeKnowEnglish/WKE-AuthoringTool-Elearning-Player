"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GardenLetterRack } from "@/components/garden/GardenLetterRack";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  abandonWeedMonsterBattle,
  failWeedMonsterBattle,
  tryDefeatWeedMonster,
} from "@/lib/garden/actions";
import { WEED_MONSTER_WORD_LENGTH } from "@/lib/garden/defaults";
import type { GardenSnapshotV1, WeedMonsterPuzzle } from "@/lib/garden/types";
import type { WeedBattleWordSlots } from "@/lib/garden/weed-battle";
import { weedBattleRemainingMs } from "@/lib/garden/weed-battle";
import { formatWeedBattleVictoryMessage } from "@/lib/garden/weed-battle-rewards";
import { WEED_MONSTER_SPRITE, spriteScaleToWidth } from "@/lib/topdown";

const FAIL_FLASH_MS = 400;
const MONSTER_ICON_PX = 56;

type Props = {
  open: boolean;
  muted: boolean;
  row: number;
  col: number;
  puzzle: WeedMonsterPuzzle;
  snapshot: GardenSnapshotV1;
  onSnapshotChange: (
    snapshot: GardenSnapshotV1,
    opts?: { announceNewSeeds?: boolean },
  ) => void;
  onSuccess: (message: string) => void;
  onFail: (message: string) => void;
  onVictory?: () => void;
  onClose: () => void;
};

function buildTrayRack(tray: string[]) {
  return tray.map((letter, index) => ({
    id: `tray:${index}`,
    letter: letter.toUpperCase(),
  }));
}

function emptySlotIds(): [string[], string[], string[]] {
  return [[], [], []];
}

export function GardenWeedBattleOverlay({
  open,
  muted,
  row,
  col,
  puzzle,
  snapshot,
  onSnapshotChange,
  onSuccess,
  onFail,
  onVictory,
  onClose,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(0);
  const [slotTrayIds, setSlotTrayIds] = useState<[string[], string[], string[]]>(emptySlotIds);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failFlash, setFailFlash] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [resolved, setResolved] = useState(false);

  const handledTimeoutRef = useRef(false);
  const rack = useMemo(() => buildTrayRack(puzzle.letterTray), [puzzle.letterTray]);
  const letterById = useMemo(() => new Map(rack.map((slot) => [slot.id, slot.letter])), [rack]);

  const allTrayIds = useMemo(
    () => slotTrayIds[0].concat(slotTrayIds[1], slotTrayIds[2]),
    [slotTrayIds],
  );

  const slotWords = useMemo(
    () =>
      slotTrayIds.map((ids) => ids.map((id) => letterById.get(id) ?? "").join("")) as [
        string,
        string,
        string,
      ],
    [slotTrayIds, letterById],
  );

  const allSlotsFull = slotWords.every((word) => word.length === WEED_MONSTER_WORD_LENGTH);
  const remainingMs = weedBattleRemainingMs(puzzle, now);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const timerUrgent = secondsLeft <= 5 && remainingMs > 0;

  useEffect(() => {
    if (!open) return;
    setActiveSlot(0);
    setSlotTrayIds(emptySlotIds());
    setErrorMessage(null);
    setFailFlash(false);
    setResolved(false);
    handledTimeoutRef.current = false;
    setNow(Date.now());
  }, [open, puzzle.puzzleId]);

  useEffect(() => {
    if (!open || resolved) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [open, resolved]);

  const runFailSequence = useCallback(
    (nextSnapshot: GardenSnapshotV1, message: string) => {
      if (resolved) return;
      setResolved(true);
      setFailFlash(true);
      playSfx("wrong", muted);
      onSnapshotChange(nextSnapshot);
      window.setTimeout(() => {
        onFail(message);
        onClose();
      }, FAIL_FLASH_MS);
    },
    [muted, onClose, onFail, onSnapshotChange, resolved],
  );

  useEffect(() => {
    if (!open || resolved || handledTimeoutRef.current) return;
    if (remainingMs > 0) return;

    handledTimeoutRef.current = true;
    const ts = Date.now();
    const failed = failWeedMonsterBattle(snapshot, row, col, ts, "timeout");
    if (!failed.ok) {
      onFail("Time's up! Wait a few seconds to try again.");
      onClose();
      return;
    }
    runFailSequence(
      failed.snapshot,
      "The weed monster won! Wait 3 seconds to fight again.",
    );
  }, [open, resolved, remainingMs, row, col, runFailSequence, snapshot, onClose, onFail]);

  const handleClose = useCallback(() => {
    if (resolved) {
      onClose();
      return;
    }
    playSfx("tap", muted);
    const abandoned = abandonWeedMonsterBattle(snapshot, row, col);
    if (abandoned.ok) onSnapshotChange(abandoned.snapshot);
    onClose();
  }, [col, muted, onClose, onSnapshotChange, resolved, row, snapshot]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  const onLetterClick = useCallback(
    (slotId: string) => {
      if (resolved || failFlash) return;
      if (allTrayIds.includes(slotId)) return;
      if (slotTrayIds[activeSlot].length >= WEED_MONSTER_WORD_LENGTH) return;

      playSfx("tap", muted);
      setSlotTrayIds((prev) => {
        const next: [string[], string[], string[]] = [
          [...prev[0]],
          [...prev[1]],
          [...prev[2]],
        ];
        next[activeSlot] = [...next[activeSlot], slotId];
        return next;
      });
      setErrorMessage(null);
    },
    [activeSlot, allTrayIds, failFlash, muted, resolved, slotTrayIds],
  );

  const onBackspace = useCallback(() => {
    if (resolved || failFlash) return;
    playSfx("tap", muted);
    setSlotTrayIds((prev) => {
      const next: [string[], string[], string[]] = [
        [...prev[0]],
        [...prev[1]],
        [...prev[2]],
      ];
      next[activeSlot] = next[activeSlot].slice(0, -1);
      return next;
    });
    setErrorMessage(null);
  }, [activeSlot, failFlash, muted, resolved]);

  const onClearSlot = useCallback(() => {
    if (resolved || failFlash) return;
    playSfx("tap", muted);
    setSlotTrayIds((prev) => {
      const next: [string[], string[], string[]] = [
        [...prev[0]],
        [...prev[1]],
        [...prev[2]],
      ];
      next[activeSlot] = [];
      return next;
    });
    setErrorMessage(null);
  }, [activeSlot, failFlash, muted, resolved]);

  const onSubmit = useCallback(() => {
    if (resolved || failFlash) return;
    if (!allSlotsFull) {
      setErrorMessage("Fill all three words with the letters below.");
      return;
    }

    const result = tryDefeatWeedMonster(
      snapshot,
      row,
      col,
      slotWords as WeedBattleWordSlots,
      Date.now(),
    );

    if (result.ok) {
      setResolved(true);
      playSfx("complete", muted);
      onSnapshotChange(result.snapshot, { announceNewSeeds: true });
      onVictory?.();
      onSuccess(formatWeedBattleVictoryMessage(result.rewards));
      onClose();
      return;
    }

    if (result.reason === "invalid_submission") {
      setErrorMessage("Fill all three words with the letters below.");
      return;
    }

    if (result.reason === "wrong_answer" || result.reason === "battle_expired") {
      if (result.snapshot) {
        runFailSequence(
          result.snapshot,
          "The weed monster won! Wait 3 seconds to fight again.",
        );
      }
      return;
    }

    setErrorMessage("Could not finish the battle. Try again.");
  }, [
    allSlotsFull,
    col,
    failFlash,
    muted,
    onClose,
    onSnapshotChange,
    onSuccess,
    onVictory,
    resolved,
    row,
    runFailSequence,
    slotWords,
    snapshot,
  ]);

  if (!open) return null;

  const monsterScale = spriteScaleToWidth(WEED_MONSTER_SPRITE, MONSTER_ICON_PX);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[82] flex flex-col items-center justify-center p-3 sm:p-4",
        failFlash ? "bg-red-600/50" : "bg-black/60",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Fight the weed monster"
    >
      <div
        className={clsx(
          "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-4 px-3 py-4 shadow-2xl sm:px-4",
          failFlash ?
            "border-red-600 bg-red-100 kid-animate-shake"
          : "border-kid-ink/20 bg-gradient-to-b from-lime-100 via-emerald-50 to-amber-50",
        )}
      >
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-kid-ink/25 bg-white/70">
              <TopDownSprite
                bounds={WEED_MONSTER_SPRITE}
                scale={monsterScale}
                knockOutGutter
                alt=""
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/60">
                Weed monster
              </p>
              <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
                Sort the letters!
              </h2>
              <p
                className={clsx(
                  "mt-0.5 text-sm font-bold tabular-nums",
                  timerUrgent ? "text-red-700" : "text-kid-ink/75",
                )}
                aria-live="polite"
              >
                {remainingMs > 0 ? `${secondsLeft}s left` : "Time's up!"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border-2 border-kid-ink bg-kid-panel px-2 py-1 text-sm font-bold text-kid-ink [touch-action:manipulation] active:scale-95"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-2 shrink-0 text-center text-sm font-semibold text-kid-ink/75">
          Tap a word box, then tap letters to spell three words.
        </p>

        <div className="mb-2 grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
          {slotWords.map((word, index) => {
            const slotIndex = index as 0 | 1 | 2;
            const isActive = activeSlot === slotIndex;
            const chars = word.padEnd(WEED_MONSTER_WORD_LENGTH, " ").split("");
            return (
              <button
                key={`word-slot-${index}`}
                type="button"
                className={clsx(
                  "rounded-xl border-4 border-dashed px-1 py-2 transition-colors [touch-action:manipulation]",
                  isActive ?
                    "border-emerald-600 bg-white"
                  : "border-kid-ink/30 bg-white/80",
                )}
                onClick={() => {
                  playSfx("tap", muted);
                  setActiveSlot(slotIndex);
                  setErrorMessage(null);
                }}
                aria-label={`Word ${index + 1}${isActive ? ", selected" : ""}`}
                aria-pressed={isActive}
              >
                <p className="text-center text-lg font-extrabold tracking-[0.2em] text-kid-ink sm:text-xl">
                  {chars.map((ch, charIndex) => (
                    <span
                      key={`${index}-${charIndex}`}
                      className={ch === " " ? "text-kid-ink/25" : undefined}
                    >
                      {ch === " " ? "·" : ch}
                    </span>
                  ))}
                </p>
              </button>
            );
          })}
        </div>

        {errorMessage ?
          <p className="mb-2 shrink-0 text-center text-sm font-bold text-red-700" role="alert">
            {errorMessage}
          </p>
        : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <GardenLetterRack
            rack={rack}
            stagingSlotIds={allTrayIds}
            onLetterClick={onLetterClick}
            disabled={resolved || failFlash}
          />
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap justify-center gap-2">
          <KidButton variant="secondary" className="!min-h-11 !min-w-0 px-4" onClick={onBackspace}>
            ← Back
          </KidButton>
          <KidButton variant="secondary" className="!min-h-11 !min-w-0 px-4" onClick={onClearSlot}>
            Clear
          </KidButton>
          <KidButton
            className="!min-h-11 !min-w-0 px-5"
            onClick={onSubmit}
            disabled={!allSlotsFull || resolved || failFlash}
          >
            Fight!
          </KidButton>
        </div>

        <p className="mt-2 shrink-0 text-center text-xs font-semibold text-kid-ink/65">
          Battle letters do not use your harvested letter tray.
        </p>
      </div>
    </div>
  );
}

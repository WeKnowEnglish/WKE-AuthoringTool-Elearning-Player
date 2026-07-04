"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GardenLetterRack } from "@/components/garden/GardenLetterRack";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import { tryClearWeedAt } from "@/lib/garden/actions";
import { buildLetterRack, letterCounts } from "@/lib/garden/spelling";
import type { GardenSnapshotV1 } from "@/lib/garden/types";

type Props = {
  open: boolean;
  muted: boolean;
  weedWord: string;
  row: number;
  col: number;
  snapshot: GardenSnapshotV1;
  onSnapshotChange: (snapshot: GardenSnapshotV1) => void;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

export function GardenWeedOverlay({
  open,
  muted,
  weedWord,
  row,
  col,
  snapshot,
  onSnapshotChange,
  onSuccess,
  onClose,
}: Props) {
  const [stagingSlotIds, setStagingSlotIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetWord = weedWord.toUpperCase();
  const rack = useMemo(() => buildLetterRack(letterCounts(targetWord)), [targetWord]);

  const stagingWord = useMemo(() => {
    const byId = new Map(rack.map((s) => [s.id, s.letter]));
    return stagingSlotIds.map((id) => byId.get(id) ?? "").join("");
  }, [rack, stagingSlotIds]);

  useEffect(() => {
    if (!open) return;
    setStagingSlotIds([]);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [open, targetWord]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onLetterClick = useCallback(
    (slotId: string) => {
      if (successMessage) return;
      playSfx("tap", muted);
      setStagingSlotIds((prev) => [...prev, slotId]);
      setErrorMessage(null);
    },
    [muted, successMessage],
  );

  const onClear = useCallback(() => {
    playSfx("tap", muted);
    setStagingSlotIds([]);
    setErrorMessage(null);
  }, [muted]);

  const onBackspace = useCallback(() => {
    playSfx("tap", muted);
    setStagingSlotIds((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  }, [muted]);

  const onSubmit = useCallback(() => {
    if (stagingWord.length < targetWord.length) {
      setErrorMessage("Tap all the letters to spell the weed word.");
      return;
    }

    const result = tryClearWeedAt(snapshot, row, col, stagingWord);
    if (!result.ok) {
      playSfx("wrong", muted);
      setErrorMessage("That's not the weed word. Try again!");
      return;
    }

    playSfx("complete", muted);
    onSnapshotChange(result.snapshot);
    setStagingSlotIds([]);
    const message = "Weed cleared! Tap to harvest your letter.";
    setSuccessMessage(message);
    onSuccess(message);
  }, [stagingWord, targetWord.length, snapshot, row, col, muted, onSnapshotChange, onSuccess]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[82] flex flex-col items-center justify-center bg-black/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Clear the weed"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-4 border-kid-ink/20 bg-gradient-to-b from-lime-100 via-emerald-50 to-amber-50 px-3 py-4 shadow-2xl sm:px-4">
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/60">
              Word weed
            </p>
            <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">Clear the weed!</h2>
            <p className="mt-0.5 text-sm font-semibold text-kid-ink/75">Spell this word:</p>
            <p className="text-2xl font-extrabold tracking-widest text-emerald-800">{targetWord}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border-2 border-kid-ink bg-kid-panel px-2 py-1 text-sm font-bold text-kid-ink [touch-action:manipulation] active:scale-95"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          className={clsx(
            "mb-2 flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-xl border-4 border-dashed border-kid-ink/30 bg-white/80 px-3",
            stagingWord.length > 0 && "border-kid-ink/50",
          )}
          aria-live="polite"
        >
          <p className="text-2xl font-extrabold tracking-widest text-kid-ink sm:text-3xl">
            {stagingWord || "—"}
          </p>
        </div>

        {errorMessage ?
          <p className="mb-2 shrink-0 text-center text-sm font-bold text-red-700" role="alert">
            {errorMessage}
          </p>
        : null}
        {successMessage ?
          <p className="mb-2 shrink-0 text-center text-sm font-bold text-emerald-800" role="status">
            {successMessage}
          </p>
        : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <GardenLetterRack
            rack={rack}
            stagingSlotIds={stagingSlotIds}
            onLetterClick={onLetterClick}
            disabled={Boolean(successMessage)}
          />
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap justify-center gap-2">
          <KidButton variant="secondary" className="!min-h-11 !min-w-0 px-4" onClick={onBackspace}>
            ← Back
          </KidButton>
          <KidButton variant="secondary" className="!min-h-11 !min-w-0 px-4" onClick={onClear}>
            Clear
          </KidButton>
          <KidButton
            className="!min-h-11 !min-w-0 px-5"
            onClick={onSubmit}
            disabled={stagingWord.length < targetWord.length || Boolean(successMessage)}
          >
            Check Word
          </KidButton>
        </div>

        <p className="mt-2 shrink-0 text-center text-xs font-semibold text-kid-ink/65">
          Weed words do not use your harvested letters.
        </p>
      </div>
    </div>
  );
}

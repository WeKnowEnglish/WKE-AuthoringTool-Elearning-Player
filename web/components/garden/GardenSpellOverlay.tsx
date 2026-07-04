"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GardenLetterRack } from "@/components/garden/GardenLetterRack";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import { GARDEN_ITEM_EMOJI, GARDEN_ITEM_LABELS } from "@/lib/garden/rewards";
import { buildLetterRack, letterInventoryKey } from "@/lib/garden/spelling";
import {
  getGardenSpellingLevel,
  spellingLevelProgress,
} from "@/lib/garden/spelling-levels";
import { trySpellWord } from "@/lib/garden/spell-actions";
import type { GardenSnapshotV1 } from "@/lib/garden/types";

type Props = {
  open: boolean;
  muted: boolean;
  snapshot: GardenSnapshotV1;
  onSnapshotChange: (snapshot: GardenSnapshotV1) => void;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

const SPELL_ERROR_MESSAGES = {
  not_a_word: "That is not a word we know yet. Try another!",
  not_in_level: "That word is not on this level's list. Try a word from the bank below!",
  missing_letters: "You do not have those letters. Tap letters below to build your word.",
  already_spelled: "You already spelled that word at this level. Try a new one!",
} as const;

export function GardenSpellOverlay({
  open,
  muted,
  snapshot,
  onSnapshotChange,
  onSuccess,
  onClose,
}: Props) {
  const [stagingSlotIds, setStagingSlotIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showWordBank, setShowWordBank] = useState(true);

  const level = useMemo(
    () => getGardenSpellingLevel(snapshot.spellingLevel),
    [snapshot.spellingLevel],
  );
  const progress = useMemo(
    () => spellingLevelProgress(snapshot.spellingLevel, snapshot.spelledAtLevel),
    [snapshot.spellingLevel, snapshot.spelledAtLevel],
  );
  const spelledSet = useMemo(
    () => new Set(snapshot.spelledAtLevel.map((w) => w.toUpperCase())),
    [snapshot.spelledAtLevel],
  );

  const lettersKey = letterInventoryKey(snapshot.letters);
  const rack = useMemo(() => buildLetterRack(snapshot.letters), [lettersKey, snapshot.letters]);

  const stagingWord = useMemo(() => {
    const byId = new Map(rack.map((s) => [s.id, s.letter]));
    return stagingSlotIds.map((id) => byId.get(id) ?? "").join("");
  }, [rack, stagingSlotIds]);

  useEffect(() => {
    if (!open) return;
    setStagingSlotIds([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowWordBank(true);
  }, [open]);

  useEffect(() => {
    if (!successMessage || !open) return;
    const delay =
      /level complete|unlocked|finished every/i.test(successMessage) ? 4000 : 2500;
    const id = window.setTimeout(() => setSuccessMessage(null), delay);
    return () => window.clearTimeout(id);
  }, [successMessage, open]);

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
      playSfx("tap", muted);
      if (successMessage) setSuccessMessage(null);
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
    if (stagingWord.length < 2) {
      setErrorMessage("Pick at least 2 letters to make a word.");
      return;
    }

    const result = trySpellWord(snapshot, stagingWord);
    if (!result.ok) {
      playSfx("wrong", muted);
      setErrorMessage(SPELL_ERROR_MESSAGES[result.reason]);
      return;
    }

    playSfx("complete", muted);
    onSnapshotChange(result.snapshot);
    setStagingSlotIds([]);

    let message = `Great job! You spelled ${result.word}.`;
    if (result.itemUnlocked) {
      const label = GARDEN_ITEM_LABELS[result.itemUnlocked];
      const emoji = GARDEN_ITEM_EMOJI[result.itemUnlocked];
      message = `${message} You unlocked ${emoji} ${label}!`;
    }
    if (result.levelComplete && result.advancedToLevel) {
      const next = getGardenSpellingLevel(result.advancedToLevel as GardenSnapshotV1["spellingLevel"]);
      message = `${message} Level complete! Welcome to Level ${result.advancedToLevel}: ${next.title}!`;
    } else if (result.levelComplete && snapshot.spellingLevel === 6) {
      message = `${message} You finished every spelling level!`;
    }
    setSuccessMessage(message);
    onSuccess(message);
  }, [stagingWord, snapshot, muted, onSnapshotChange, onSuccess]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[82] flex flex-col items-center justify-center bg-black/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Spell a word"
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-4 border-kid-ink/20 bg-gradient-to-b from-lime-100 via-emerald-50 to-amber-50 px-3 py-4 shadow-2xl sm:px-4">
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/60">
              Level {level.id} · {level.subtitle}
            </p>
            <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">{level.title}</h2>
            <p className="mt-0.5 text-sm font-semibold text-kid-ink/75">
              {progress.spelled} / {progress.total} words spelled
            </p>
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
          />

          <div className="mt-3">
            <button
              type="button"
              className="w-full rounded-lg border-2 border-kid-ink/30 bg-white/70 px-2 py-1.5 text-left text-xs font-bold text-kid-ink [touch-action:manipulation]"
              onClick={() => setShowWordBank((v) => !v)}
              aria-expanded={showWordBank}
            >
              {showWordBank ? "▼" : "▶"} Word bank for this level
            </button>
            {showWordBank ?
              <div className="mt-1.5 flex flex-wrap gap-1 rounded-lg border-2 border-kid-ink/20 bg-white/60 p-2">
                {level.words.map((word) => {
                  const done = spelledSet.has(word);
                  return (
                    <span
                      key={word}
                      className={clsx(
                        "rounded px-1.5 py-0.5 text-xs font-bold",
                        done ?
                          "bg-emerald-200 text-emerald-900 line-through"
                        : "bg-kid-panel text-kid-ink",
                      )}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            : null}
          </div>
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
            disabled={stagingWord.length < 2}
          >
            Check Word
          </KidButton>
        </div>

        <p className="mt-2 shrink-0 text-center text-xs font-semibold text-kid-ink/65">
          Spell every word in the level to advance · Complete Sprout → 🪣 · Complete Bud → 🧪
        </p>
      </div>
    </div>
  );
}

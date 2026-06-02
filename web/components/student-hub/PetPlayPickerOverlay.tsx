"use client";

import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import {
  IMPLEMENTED_PLAY_MINIGAMES,
  type PlayMiniGameId,
} from "@/lib/pet/play-minigames";

const PLAY_GAME_LABELS: Record<PlayMiniGameId, string> = {
  climb: "Climb",
  scrabble: "Scrabble",
  memory: "Memory",
  game4: "Game 4",
};

type Props = {
  open: boolean;
  onPick: (id: PlayMiniGameId) => void;
  onClose: () => void;
};

export function PetPlayPickerOverlay({ open, onPick, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[82] flex flex-col items-center justify-center bg-black/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a play game"
    >
      <div className="w-full max-w-lg rounded-2xl border-4 border-kid-ink/20 bg-gradient-to-b from-lime-100 via-lime-50 to-sky-50 px-4 py-4 shadow-2xl">
        <p className="text-center text-lg font-extrabold text-kid-ink">Choose a play game</p>
        <p className="mt-1 text-center text-xs font-semibold text-kid-ink/75">
          Pick one to play with your pet
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {IMPLEMENTED_PLAY_MINIGAMES.map((id) => (
            <KidButton
              key={id}
              type="button"
              variant="accent"
              className="!min-h-14 !py-3 text-sm"
              onClick={() => onPick(id)}
            >
              {PLAY_GAME_LABELS[id]}
            </KidButton>
          ))}
        </div>
        <KidButton
          type="button"
          variant="secondary"
          className="mt-3 w-full !py-2 text-sm"
          onClick={onClose}
        >
          Cancel
        </KidButton>
      </div>
    </div>
  );
}

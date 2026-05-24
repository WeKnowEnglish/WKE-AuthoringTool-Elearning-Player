"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useState } from "react";
import { PetSandwichBuildActivity } from "@/components/pet-sandwich/PetSandwichBuildActivity";
import { PetSandwichIntro } from "@/components/pet-sandwich/PetSandwichIntro";
import type { SandwichMiniGameResultTier } from "@/lib/pet/care-actions";

type ShellPhase = "intro" | "play";

type Props = {
  open: boolean;
  muted: boolean;
  onComplete: (tier: SandwichMiniGameResultTier) => void;
  onClose: () => void;
};

export function PetSandwichOverlay({ open, muted, onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<ShellPhase>("intro");
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setPlayKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onIntroFinished = useCallback(() => {
    setPhase("play");
  }, []);

  const onPlayAgain = useCallback(() => {
    setPhase("intro");
    setPlayKey((k) => k + 1);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[82] flex flex-col items-center justify-center bg-black/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Make a sandwich for your pet"
    >
      <div
        className={clsx(
          "flex w-full max-w-lg flex-col rounded-2xl border-4 border-kid-ink/20 bg-gradient-to-b from-amber-100 via-amber-50 to-emerald-50 shadow-2xl",
          phase === "play" && "min-h-0",
          "px-3 py-3 sm:px-4",
          phase === "intro" ?
            "max-h-[92dvh] overflow-visible"
          : "h-[min(92dvh,680px)] min-h-[28rem] overflow-hidden",
        )}
      >
        {phase === "intro" ?
          <PetSandwichIntro muted={muted} onFinished={onIntroFinished} />
        : <div className="flex min-h-0 flex-1 flex-col">
            <PetSandwichBuildActivity
              key={playKey}
              muted={muted}
              onComplete={onComplete}
              onCancel={onClose}
              onPlayAgain={onPlayAgain}
            />
          </div>
        }
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { PetDrinkMixActivity } from "@/components/pet-blender/PetDrinkMixActivity";

type Props = {
  open: boolean;
  muted: boolean;
  onSuccess: () => void;
  onClose: () => void;
};

export function PetDrinkMixOverlay({ open, muted, onSuccess, onClose }: Props) {
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
      className="fixed inset-0 z-[82] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Make a drink for your pet"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <KidPanel className="max-h-[92dvh] w-full max-w-lg overflow-y-auto border-4 border-kid-ink p-4 shadow-2xl">
        <h2 className="text-center text-xl font-extrabold text-kid-ink">Blender Bar</h2>
        <p className="mt-1 text-center text-sm font-semibold text-kid-ink/80">
          Mix the drink your pet asked for!
        </p>
        <div className="mt-3">
          <PetDrinkMixActivity
            muted={muted}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </KidPanel>
    </div>
  );
}

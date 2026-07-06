"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  unlocked: boolean;
  onOpen: () => void;
};

export function GardenEarnSeedsButton({ unlocked, onOpen }: Props) {
  if (!unlocked) return null;

  return (
    <KidButton
      type="button"
      variant="secondary"
      className="!min-h-9 w-full shrink-0 !min-w-0 !px-2 !py-1.5 !text-xs sm:!text-sm"
      aria-label="Earn seeds with a letter word puzzle"
      onClick={onOpen}
    >
      <span className="inline-flex items-center justify-center gap-1.5">
        <span aria-hidden>🧩</span>
        <span>Earn Seeds</span>
      </span>
    </KidButton>
  );
}

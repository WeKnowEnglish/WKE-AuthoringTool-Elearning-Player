"use client";

import { clsx } from "clsx";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import type { AnimatedPetSize } from "@/components/pet/AnimatedPetPlayer";
import type { PetMood } from "@/lib/pet/types";

type Props = {
  mood?: PetMood;
  size?: AnimatedPetSize;
  show?: boolean;
  className?: string;
};

/** Animated pet anchored beside the player (follower pose). */
export function PetCompanion({
  mood = "normal",
  size = "sm",
  show = true,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        "pointer-events-none absolute z-10",
        "right-1 bottom-[4.5rem] sm:right-2 sm:bottom-[5rem]",
        className,
      )}
      aria-hidden={!show}
    >
      <div className="origin-bottom-right -rotate-6 scale-95 drop-shadow-[2px_3px_0_rgba(21,38,104,0.25)]">
        <AnimatedPet mood={mood} size={size} show={show} />
      </div>
    </div>
  );
}

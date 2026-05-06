"use client";

import { useEffect, useState } from "react";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";

type Props = {
  /** Gold shown in the label (supports multiple bar completions in one tick). */
  goldAmount: number;
};

/**
 * Floating “+N gold” and short confetti over the activity energy HUD.
 * Parent should pass `key={uniqueId}` per burst so animation replays. Layer is non-interactive.
 */
export function KidActivityEnergyRewardPop({ goldAmount }: Props) {
  const [confettiOn, setConfettiOn] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setConfettiOn(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex min-h-[5.5rem] justify-center overflow-visible"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
        {confettiOn ? <KidConfetti active /> : null}
      </div>
      <span className="kid-energy-gold-pop absolute bottom-full left-1/2 mb-1 whitespace-nowrap rounded-full border-2 border-amber-600 bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-950 shadow-md">
        +{goldAmount} gold
      </span>
    </div>
  );
}

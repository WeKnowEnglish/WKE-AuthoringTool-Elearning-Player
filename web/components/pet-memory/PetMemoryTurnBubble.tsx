"use client";

import type { ActiveSide } from "@/lib/memory/memory-session";

type Props = {
  activeSide: ActiveSide;
  pairsRemaining: number;
  playerMatches: number;
  petThinking?: boolean;
  resolving?: boolean;
};

export function PetMemoryTurnBubble({
  activeSide,
  pairsRemaining,
  playerMatches,
  petThinking,
  resolving,
}: Props) {
  let headline = "Your turn — find a word and its picture!";
  if (resolving) {
    headline = "Let’s see…";
  } else if (petThinking || activeSide === "pet") {
    headline = "Your pet is looking…";
  }

  return (
    <div className="rounded-xl border-2 border-kid-ink/25 bg-white/90 px-3 py-2 text-center shadow-sm">
      <p className="text-sm font-extrabold text-kid-ink">{headline}</p>
      <p className="mt-0.5 text-xs font-semibold text-kid-ink/75">
        Pairs left: {pairsRemaining} · Your matches: {playerMatches}
      </p>
    </div>
  );
}

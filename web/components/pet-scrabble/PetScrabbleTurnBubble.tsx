"use client";

import type { ActiveSide } from "@/lib/scrabble/scrabble-session";

type Props = {
  activeSide: ActiveSide;
  wordsPlayed: number;
  playerScore: number;
  petThinking?: boolean;
  message?: string | null;
};

export function PetScrabbleTurnBubble({
  activeSide,
  wordsPlayed,
  playerScore,
  petThinking,
  message,
}: Props) {
  let headline = "Your turn! Spell a word.";
  if (petThinking || activeSide === "pet") {
    headline = "Your pet is thinking…";
  }

  return (
    <div className="rounded-xl border-2 border-kid-ink/25 bg-white/90 px-3 py-2 text-center shadow-sm">
      <p className="text-sm font-extrabold text-kid-ink">{headline}</p>
      <p className="mt-0.5 text-xs font-semibold text-kid-ink/75">
        Words {wordsPlayed} / 6 · Your score: {playerScore}
      </p>
      {message ?
        <p className="mt-1 text-xs font-bold text-rose-800">{message}</p>
      : null}
    </div>
  );
}

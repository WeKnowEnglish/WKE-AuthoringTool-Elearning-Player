"use client";

import { clsx } from "clsx";
import { useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { playSfx } from "@/lib/audio/sfx";
import {
  SCRABBLE_PLAY_DELTAS,
  type ScrabblePlayOutcome,
} from "@/lib/pet/care-actions";
import type { PetMeterId } from "@/lib/pet/types";

const METER_LABELS: Record<PetMeterId, string> = {
  hunger: "Hunger",
  thirst: "Thirst",
  energy: "Energy",
  cleanliness: "Clean",
  happiness: "Happy",
};

function DeltaPill({ label, delta }: { label: string; delta: number }) {
  const positive = delta >= 0;
  return (
    <div
      className={clsx(
        "flex flex-1 flex-col items-center rounded-xl border-2 border-kid-ink px-2 py-2 shadow-[2px_2px_0_#0a2f86]",
        positive ? "bg-emerald-50" : "bg-rose-50",
      )}
    >
      <span
        className={clsx(
          "text-2xl font-black leading-none sm:text-3xl",
          positive ? "text-emerald-800" : "text-rose-800",
        )}
      >
        {positive ? "+" : ""}
        {delta}
      </span>
      <span className="mt-0.5 text-xs font-bold text-kid-ink sm:text-sm">{label}</span>
    </div>
  );
}

type Props = {
  outcome: ScrabblePlayOutcome;
  playerScore: number;
  petScore: number;
  goldEarned: number;
  muted: boolean;
  onReturn: () => void;
  onPlayAgain: () => void;
};

export function PetScrabbleResultsScreen({
  outcome,
  playerScore,
  petScore,
  goldEarned,
  muted,
  onReturn,
  onPlayAgain,
}: Props) {
  const completed = outcome === "completed";
  const deltas = SCRABBLE_PLAY_DELTAS[outcome];
  const deltaRows = (
    Object.entries(deltas) as [PetMeterId, number][]
  ).filter(([, v]) => v !== undefined);

  useEffect(() => {
    playSfx(completed ? "complete" : "wrong", muted);
  }, [completed, muted]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center py-4">
      {completed ? <KidConfetti active /> : null}
      <KidPanel className="relative space-y-4 border-kid-ink bg-white/95 p-4">
        <div className="flex flex-col items-center text-center">
          <AnimatedPet
            mood={completed ? "playful" : "normal"}
            size="lg"
            displayAnchor="bottom"
          />
          <p className="mt-3 text-2xl font-extrabold text-kid-ink sm:text-3xl">
            {completed ? "Great game!" : "Stopped early"}
          </p>
          <p className="mt-1 text-sm font-semibold text-kid-ink/85">
            {completed ?
              "You played all six words with your pet!"
            : "Come back and finish a full game sometime."}
          </p>
          <p className="mt-2 text-sm font-bold text-kid-ink">
            Your score: {playerScore} · Pet score: {petScore}
          </p>
          {completed && goldEarned > 0 ?
            <p className="mt-1 text-sm font-extrabold text-amber-800">
              +{goldEarned} gold
            </p>
          : null}
        </div>

        {deltaRows.length > 0 ?
          <div className="grid grid-cols-2 gap-2">
            {deltaRows.map(([meterId, delta]) => (
              <DeltaPill key={meterId} label={METER_LABELS[meterId]} delta={delta} />
            ))}
          </div>
        : null}

        <div className="grid grid-cols-2 gap-2">
          <KidButton
            type="button"
            variant="secondary"
            className="flex flex-col items-center gap-1 !py-2"
            onClick={() => {
              playSfx("tap", muted);
              onReturn();
            }}
          >
            <span className="text-xl leading-none" aria-hidden>
              🏠
            </span>
            <span className="text-sm font-extrabold">Return</span>
          </KidButton>
          <KidButton
            type="button"
            variant="accent"
            className="flex flex-col items-center gap-1 !py-2"
            onClick={() => {
              playSfx("tap", muted);
              onPlayAgain();
            }}
          >
            <span className="text-xl leading-none" aria-hidden>
              🔄
            </span>
            <span className="text-sm font-extrabold">Play again</span>
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}

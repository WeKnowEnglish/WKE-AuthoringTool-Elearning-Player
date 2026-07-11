"use client";

import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";

type Props = {
  completedByName: string | null;
  treesChopped: number;
  isHost: boolean;
  onPlayAgain?: () => void;
};

export function LiveGameVictoryOverlay({
  completedByName,
  treesChopped,
  isHost,
  onPlayAgain,
}: Props) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <KidConfetti active />
      <div
        className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-6 text-center shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-game-victory-title"
      >
        <h2 id="live-game-victory-title" className="text-3xl font-extrabold text-kid-ink">
          Team win!
        </h2>
        <p className="mt-2 text-lg font-semibold text-kid-ink/80">
          English Craft complete — great teamwork!
        </p>

        <dl className="mt-5 space-y-2 rounded-xl border-2 border-kid-ink/20 bg-kid-surface-muted px-4 py-3 text-left text-sm">
          {completedByName ?
            <div className="flex justify-between gap-3">
              <dt className="font-bold text-kid-ink/70">Flag touched by</dt>
              <dd className="font-semibold text-kid-ink">{completedByName}</dd>
            </div>
          : null}
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-kid-ink/70">Trees chopped</dt>
            <dd className="font-semibold text-kid-ink">{treesChopped}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isHost && onPlayAgain ?
            <KidButton variant="primary" onClick={onPlayAgain}>
              Play again
            </KidButton>
          : null}
          <Link href="/live-game">
            <KidButton variant="secondary">Leave</KidButton>
          </Link>
        </div>
      </div>
    </div>
  );
}

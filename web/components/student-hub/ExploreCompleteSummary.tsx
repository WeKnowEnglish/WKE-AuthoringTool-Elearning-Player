"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { ExploreRunCompleteResult } from "@/lib/explore/record-explore-run-complete";

type Props = {
  result: ExploreRunCompleteResult;
  muted: boolean;
  onPlayAgain: () => void;
  onOpenWords: () => void;
  onDone: () => void;
};

export function ExploreCompleteSummary({
  result,
  muted: _muted,
  onPlayAgain,
  onOpenWords,
  onDone,
}: Props) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <KidPanel className="max-h-[90dvh] w-full max-w-md overflow-y-auto text-center">
        <h2 className="text-2xl font-extrabold text-kid-ink">Run complete!</h2>
        <p className="mt-1 text-lg font-semibold text-kid-ink/90">{result.chapterTitle}</p>

        <ul className="mt-4 space-y-2 text-left text-sm font-semibold text-kid-ink">
          {result.encounterGold > 0 ?
            <li>+{result.encounterGold} gold from encounter</li>
          : null}
          {result.experienceDelta > 0 ?
            <li>+{result.experienceDelta} XP</li>
          : null}
          {result.encounterWordLabels.length > 0 ?
            <li>
              Words: {result.encounterWordLabels.join(", ")}
            </li>
          : null}
          <li>
            Area progress: {result.areaDiscoveredCount}/{result.areaTotalCount} words (
            {result.areaPercent}%)
          </li>
        </ul>

        {result.areaJustCompleted ?
          <p className="mt-4 rounded-xl border-4 border-emerald-700 bg-emerald-50 px-3 py-2 text-base font-bold text-emerald-950">
            You found every word in {result.chapterTitle}!
            {result.nextAreaTitle ?
              <> {result.nextAreaTitle} is now unlocked.</>
            : null}
          </p>
        : (
          <p className="mt-4 text-sm font-semibold text-kid-ink/80">
            Keep exploring to find more words for this area.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <KidButton type="button" variant="accent" onClick={onPlayAgain}>
            Play again
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={onOpenWords}>
            Collection → Words
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={onDone}>
            Done
          </KidButton>
        </div>
      </KidPanel>
    </div>
  );
}

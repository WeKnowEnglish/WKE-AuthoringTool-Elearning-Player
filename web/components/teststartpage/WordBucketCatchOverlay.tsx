"use client";

import { useCallback, useEffect } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { WordBucketCatchCore } from "@/components/lesson/interactions/WordBucketCatchCore";
import type { WordBucketCatchConfig } from "@/lib/lesson/word-bucket-catch";
import { awardRewards } from "@/lib/progress/rewards";

export function WordBucketCatchOverlay({
  muted,
  onClose,
  config,
  completionEventId,
  onRewardsGranted,
  onTestCorrectCatch,
}: {
  muted: boolean;
  onClose: () => void;
  config: WordBucketCatchConfig;
  /** Unique per run so completion gold is not double-granted on replay. */
  completionEventId: string;
  onRewardsGranted?: () => void;
  onTestCorrectCatch?: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleTestComplete = useCallback(
    (payload: {
      breakdown: { totalGold: number; experienceDelta: number };
      completionEventId?: string;
    }) => {
      awardRewards({
        goldDelta: payload.breakdown.totalGold,
        experienceDelta: payload.breakdown.experienceDelta,
        eventId: payload.completionEventId ?? completionEventId,
      });
      onRewardsGranted?.();
    },
    [completionEventId, onRewardsGranted],
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/55 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Word bucket catch game"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 overflow-hidden rounded-2xl border-4 border-kid-ink bg-kid-panel p-3 shadow-[8px_8px_0_#0a2f86] sm:p-4">
        <WordBucketCatchCore
          variant="test"
          config={config}
          muted={muted}
          testCompletionEventId={completionEventId}
          onTestCorrectCatch={onTestCorrectCatch}
          onTestGameComplete={(p) => {
            handleTestComplete({
              breakdown: p.breakdown,
              completionEventId: p.completionEventId,
            });
          }}
          headerAction={
            <KidButton type="button" variant="secondary" onClick={onClose}>
              Close
            </KidButton>
          }
          roundEndExtraActions={
            <KidButton type="button" variant="secondary" onClick={onClose}>
              Close
            </KidButton>
          }
        />
      </div>
    </div>
  );
}

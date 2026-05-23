"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExploreRunView } from "@/components/lesson/interactions/ExploreRunView";
import { ExploreCompleteSummary } from "@/components/student-hub/ExploreCompleteSummary";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  getExploreAreaDiscoverySummary,
  getExploreAreaEncounterWordPool,
  isExploreAreaUnlocked,
} from "@/lib/explore/area-discovery";
import { getExploreChapterForArea } from "@/lib/explore/chapters";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { ExploreEncounterRollResult } from "@/lib/explore/explore-encounter-roll";
import {
  recordExploreRunComplete,
  type ExploreRunCompleteResult,
} from "@/lib/explore/record-explore-run-complete";
import type { CollectionPageId } from "@/components/student-hub/collection/types";

type Props = {
  areaId: ExploreAreaId;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onEconomyChange?: () => void;
  onOpenCollection?: (page: CollectionPageId) => void;
};

export function ExploreChapterOverlay({
  areaId,
  sessionSeed,
  muted,
  onClose,
  onEconomyChange,
  onOpenCollection,
}: Props) {
  const chapter = getExploreChapterForArea(areaId);
  const encounterWordPool = getExploreAreaEncounterWordPool(areaId);
  const areaSummary = getExploreAreaDiscoverySummary(areaId);
  const unlocked = isExploreAreaUnlocked(areaId);

  const [phase, setPhase] = useState<"lobby" | "run" | "summary">("lobby");
  const [runKey, setRunKey] = useState(0);
  const [completeResult, setCompleteResult] = useState<ExploreRunCompleteResult | null>(
    null,
  );
  const encounterRollRef = useRef<ExploreEncounterRollResult | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const startRun = useCallback(() => {
    playSfx("tap", muted);
    encounterRollRef.current = null;
    setCompleteResult(null);
    setPhase("run");
  }, [muted]);

  const handleEncounterGranted = useCallback((roll: ExploreEncounterRollResult) => {
    encounterRollRef.current = roll;
    onEconomyChange?.();
  }, [onEconomyChange]);

  const handleRunPass = useCallback(() => {
    playSfx("complete", muted);
    const roll = encounterRollRef.current;
    const result = recordExploreRunComplete({
      areaId,
      runSeed: `${sessionSeed}:${runKey}`,
      encounterGold: roll?.gold ?? 0,
      encounterWordIds: roll?.wordIds ?? [],
      encounterTier: roll?.tier,
    });
    setCompleteResult(result);
    setPhase("summary");
    onEconomyChange?.();
  }, [areaId, sessionSeed, runKey, muted, onEconomyChange]);

  const handlePlayAgain = useCallback(() => {
    playSfx("tap", muted);
    setRunKey((k) => k + 1);
    encounterRollRef.current = null;
    setCompleteResult(null);
    setPhase("run");
  }, [muted]);

  const handleDone = useCallback(() => {
    playSfx("tap", muted);
    onClose();
  }, [muted, onClose]);

  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
        <KidPanel className="max-w-md text-center">
          <h2 className="text-xl font-extrabold text-kid-ink">Area locked</h2>
          <p className="mt-2 text-sm font-semibold text-kid-ink/85">
            Find all words in the previous area to unlock {chapter.title}.
          </p>
          <KidButton type="button" className="mt-4" variant="secondary" onClick={onClose}>
            Back
          </KidButton>
        </KidPanel>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
        <KidPanel className="max-w-md text-center">
          <h2 className="text-2xl font-extrabold text-kid-ink">{chapter.title}</h2>
          <p className="mt-1 text-base font-semibold text-kid-ink/85">{chapter.subtitle}</p>
          <p className="mt-3 text-sm font-bold text-kid-ink">
            Words found here: {areaSummary.discoveredCount}/{areaSummary.totalCount} (
            {areaSummary.percent}%)
          </p>
          <p className="mt-2 text-sm font-semibold text-kid-ink/80">
            Run, spell words at each gate, and collect loot at the end. Replay to find missing
            words.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <KidButton type="button" variant="accent" onClick={startRun}>
              Start run
            </KidButton>
            <KidButton type="button" variant="secondary" onClick={onClose}>
              Close
            </KidButton>
          </div>
        </KidPanel>
      </div>
    );
  }

  if (phase === "summary" && completeResult) {
    return (
      <>
        <div className="fixed inset-0 z-[80] flex flex-col bg-sky-100" aria-hidden>
          <div className="min-h-0 flex-1 opacity-40" />
        </div>
        <ExploreCompleteSummary
          result={completeResult}
          muted={muted}
          onPlayAgain={handlePlayAgain}
          onOpenWords={() => {
            playSfx("tap", muted);
            onOpenCollection?.("words");
            onClose();
          }}
          onDone={handleDone}
        />
      </>
    );
  }

  const lessonId = `explore-${areaId}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-sky-100 text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${chapter.title} explore`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-kid-ink bg-white px-3 py-2">
        <p className="min-w-0 truncate text-sm font-extrabold text-kid-ink">{chapter.title}</p>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-9 shrink-0 text-sm"
          onClick={onClose}
        >
          Close
        </KidButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        <ExploreRunView
          key={`${sessionSeed}:${runKey}`}
          parsed={chapter.payload}
          encounterWordPool={encounterWordPool}
          muted={muted}
          passed={phase === "summary"}
          lessonId={lessonId}
          screenId="run"
          onPass={handleRunPass}
          onEconomyChange={onEconomyChange}
          onEncounterGranted={handleEncounterGranted}
        />
      </div>
    </div>
  );
}

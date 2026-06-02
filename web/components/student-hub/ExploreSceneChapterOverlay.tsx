"use client";

import { useCallback, useEffect, useState } from "react";
import { ExploreSceneClozeStep } from "@/components/lesson/interactions/explore-scene/ExploreSceneClozeStep";
import { ExploreSceneComplete } from "@/components/lesson/interactions/explore-scene/ExploreSceneComplete";
import { ExploreSceneIntro } from "@/components/lesson/interactions/explore-scene/ExploreSceneIntro";
import { ExploreSceneRoam } from "@/components/lesson/interactions/explore-scene/ExploreSceneRoam";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  getExploreAreaDiscoverySummary,
  isExploreAreaUnlocked,
} from "@/lib/explore/area-discovery";
import { getExploreArea } from "@/lib/explore/areas";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import { getExploreScene } from "@/lib/explore/scenes";
import type { ExploreSceneId } from "@/lib/explore/scenes/types";
import {
  recordExploreRunComplete,
  type ExploreRunCompleteResult,
} from "@/lib/explore/record-explore-run-complete";
import type { CollectionPageId } from "@/components/student-hub/collection/types";

type ScenePhase = "lobby" | "intro" | "roam" | "cloze" | "complete";

type Props = {
  areaId: ExploreAreaId;
  sceneId: ExploreSceneId;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onEconomyChange?: () => void;
  onOpenCollection?: (page: CollectionPageId) => void;
};

export function ExploreSceneChapterOverlay({
  areaId,
  sceneId,
  sessionSeed,
  muted,
  onClose,
  onEconomyChange,
  onOpenCollection,
}: Props) {
  const area = getExploreArea(areaId);
  const scene = getExploreScene(sceneId);
  const areaSummary = getExploreAreaDiscoverySummary(areaId);
  const unlocked = isExploreAreaUnlocked(areaId);

  const [phase, setPhase] = useState<ScenePhase>("lobby");
  const [runKey, setRunKey] = useState(0);
  const [clozeWordIds, setClozeWordIds] = useState<string[]>([]);
  const [completeResult, setCompleteResult] = useState<ExploreRunCompleteResult | null>(
    null,
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const resetRun = useCallback(() => {
    setClozeWordIds([]);
    setCompleteResult(null);
    setRunKey((k) => k + 1);
  }, []);

  const startScene = useCallback(() => {
    playSfx("tap", muted);
    resetRun();
    setPhase("intro");
  }, [muted, resetRun]);

  const handleClozePass = useCallback(() => {
    playSfx("complete", muted);
    const result = recordExploreRunComplete({
      areaId,
      runSeed: `${sessionSeed}:${runKey}:scene`,
      encounterGold: 0,
      encounterWordIds: [],
    });
    setCompleteResult(result);
    setPhase("complete");
    onEconomyChange?.();
  }, [areaId, sessionSeed, runKey, muted, onEconomyChange]);

  const handlePlayAgain = useCallback(() => {
    playSfx("tap", muted);
    resetRun();
    setPhase("intro");
  }, [muted, resetRun]);

  const handleReturnHome = useCallback(() => {
    playSfx("tap", muted);
    onClose();
  }, [muted, onClose]);

  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
        <KidPanel className="max-w-md text-center">
          <h2 className="text-xl font-extrabold text-kid-ink">Area locked</h2>
          <p className="mt-2 text-sm font-semibold text-kid-ink/85">
            Find all words in the previous area to unlock {area.title}.
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
          <h2 className="text-2xl font-extrabold text-kid-ink">{scene.title}</h2>
          <p className="mt-1 text-base font-semibold text-kid-ink/85">{scene.subtitle}</p>
          <p className="mt-3 text-sm font-bold text-kid-ink">
            Words found here: {areaSummary.discoveredCount}/{areaSummary.totalCount} (
            {areaSummary.percent}%)
          </p>
          <p className="mt-2 text-sm font-semibold text-kid-ink/80">
            Explore the house, collect words and items for brother&apos;s homework, then
            finish the sentences.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <KidButton type="button" variant="accent" onClick={startScene}>
              Start
            </KidButton>
            <KidButton type="button" variant="secondary" onClick={onClose}>
              Close
            </KidButton>
          </div>
        </KidPanel>
      </div>
    );
  }

  if (phase === "complete" && completeResult) {
    return (
      <>
        <div className="fixed inset-0 z-[80] flex flex-col bg-sky-100" aria-hidden>
          <div className="min-h-0 flex-1 opacity-40" />
        </div>
        <ExploreSceneComplete
          ending={scene.ending}
          result={completeResult}
          sceneId={sceneId}
          muted={muted}
          onPlayAgain={handlePlayAgain}
          onReturnHome={handleReturnHome}
          onOpenWords={
            onOpenCollection ?
              () => {
                playSfx("tap", muted);
                onOpenCollection("words");
                onClose();
              }
            : undefined
          }
        />
      </>
    );
  }

  const phaseLabel =
    phase === "intro" ? "Story"
    : phase === "roam" ? "Explore"
    : phase === "cloze" ? "Homework"
    : scene.title;

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-sky-100 text-kid-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`${scene.title} explore scene`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-kid-ink bg-white px-3 py-2">
        <p className="min-w-0 truncate text-sm font-extrabold text-kid-ink">
          {scene.title} · {phaseLabel}
        </p>
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
        {phase === "intro" ?
          <ExploreSceneIntro
            intro={scene.intro}
            muted={muted}
            onContinue={() => {
              playSfx("tap", muted);
              setPhase("roam");
            }}
          />
        : phase === "roam" ?
          <ExploreSceneRoam
            key={`${sessionSeed}:${runKey}`}
            scene={scene}
            muted={muted}
            runKey={`${sessionSeed}:${runKey}`}
            onEconomyChange={onEconomyChange}
            onReadyForCloze={(wordIds) => {
              playSfx("tap", muted);
              setClozeWordIds(wordIds);
              setPhase("cloze");
            }}
          />
        : phase === "cloze" ?
          <ExploreSceneClozeStep
            key={`cloze:${sessionSeed}:${runKey}`}
            scene={scene}
            collectedWordIds={clozeWordIds}
            clozeSeed={`${sessionSeed}:${runKey}:cloze`}
            muted={muted}
            onPass={handleClozePass}
          />
        : null}
      </div>
    </div>
  );
}

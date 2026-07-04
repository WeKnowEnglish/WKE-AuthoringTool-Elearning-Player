"use client";

import { useCallback, useMemo, useState } from "react";
import { ExploreSceneClozeStep } from "@/components/lesson/interactions/explore-scene/ExploreSceneClozeStep";
import { ExploreSceneIntro } from "@/components/lesson/interactions/explore-scene/ExploreSceneIntro";
import { ExploreSceneRoam } from "@/components/lesson/interactions/explore-scene/ExploreSceneRoam";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { BAKERY_RECIPE_RESCUE_SCENE } from "@/lib/explore/scenes/bakery-recipe-rescue";

type ExplorerStep = "intro" | "roam" | "cloze" | "done";

type Props = {
  sessionSeed: string;
  muted?: boolean;
  onComplete: (input?: { evidenceCount?: number }) => void;
};

/** Pilot EXPLORER phase — bypasses area unlock for golden-reference testing. */
export function BakeryExplorerPilotPhase({
  sessionSeed,
  muted = false,
  onComplete,
}: Props) {
  const [step, setStep] = useState<ExplorerStep>("intro");
  const [runKey, setRunKey] = useState(0);
  const [collectedWordIds, setCollectedWordIds] = useState<string[]>([]);
  const scene = BAKERY_RECIPE_RESCUE_SCENE;
  const clozeSeed = useMemo(() => `${sessionSeed}:bakery:${runKey}`, [sessionSeed, runKey]);

  const handleClozePass = useCallback(() => {
    setStep("done");
  }, []);

  if (step === "intro") {
    return (
      <div className="min-h-[420px]">
        <ExploreSceneIntro
          intro={scene.intro}
          muted={muted}
          onContinue={() => setStep("roam")}
        />
      </div>
    );
  }

  if (step === "roam") {
    return (
      <div className="min-h-[min(70vh,540px)]">
        <ExploreSceneRoam
          key={runKey}
          scene={scene}
          muted={muted}
          isPreview
          runKey={clozeSeed}
          onReadyForCloze={(ids) => {
            setCollectedWordIds(ids);
            setStep("cloze");
          }}
        />
      </div>
    );
  }

  if (step === "cloze") {
    return (
      <div className="min-h-[420px]">
        <ExploreSceneClozeStep
          scene={scene}
          collectedWordIds={collectedWordIds}
          clozeSeed={clozeSeed}
          muted={muted}
          onPass={handleClozePass}
          onBack={() => setStep("roam")}
        />
      </div>
    );
  }

  return (
    <KidPanel className="mx-auto max-w-lg text-center">
      <h2 className="text-2xl font-extrabold text-kid-ink">{scene.ending.title}</h2>
      <p className="mt-2 text-base font-semibold text-kid-ink/90">{scene.ending.body_text}</p>
      <KidButton
        type="button"
        className="mt-6"
        onClick={() => onComplete({ evidenceCount: collectedWordIds.length })}
      >
        Continue to reflection
      </KidButton>
    </KidPanel>
  );
}

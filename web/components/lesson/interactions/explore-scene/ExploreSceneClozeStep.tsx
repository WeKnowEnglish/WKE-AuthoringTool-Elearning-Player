"use client";

import { useMemo, useState } from "react";
import { FillBlanksView } from "@/components/lesson/interactions/FillBlanksView";
import { buildExploreSceneClozePayload } from "@/lib/explore/explore-scene-cloze";
import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";

type Props = {
  scene: ExploreSceneDefinition;
  collectedWordIds: string[];
  clozeSeed: string;
  muted: boolean;
  onPass: () => void;
  onBack?: () => void;
};

export function ExploreSceneClozeStep({
  scene,
  collectedWordIds,
  clozeSeed,
  muted,
  onPass,
  onBack,
}: Props) {
  const [passed, setPassed] = useState(false);

  const parsed = useMemo(
    () => buildExploreSceneClozePayload(scene, collectedWordIds, clozeSeed),
    [scene, collectedWordIds, clozeSeed],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FillBlanksView
        parsed={parsed}
        muted={muted}
        passed={passed}
        controlsPlacement="stage-footer"
        showBack={Boolean(onBack)}
        onBack={onBack ?? (() => {})}
        onNext={onPass}
        onPass={() => {
          setPassed(true);
          onPass();
        }}
        onWrong={() => {}}
      />
    </div>
  );
}

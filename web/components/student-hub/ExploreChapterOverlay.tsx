"use client";

import { ExploreRunnerChapterOverlay } from "@/components/student-hub/ExploreRunnerChapterOverlay";
import { ExploreSceneChapterOverlay } from "@/components/student-hub/ExploreSceneChapterOverlay";
import { getExploreArea } from "@/lib/explore/areas";
import type { ExploreAreaId } from "@/lib/explore/areas/types";
import type { CollectionPageId } from "@/components/student-hub/collection/types";

type Props = {
  areaId: ExploreAreaId;
  sessionSeed: string;
  muted: boolean;
  onClose: () => void;
  onEconomyChange?: () => void;
  onOpenCollection?: (page: CollectionPageId) => void;
};

export function ExploreChapterOverlay(props: Props) {
  const area = getExploreArea(props.areaId);

  if (area.playMode === "scene" && area.sceneId) {
    return (
      <ExploreSceneChapterOverlay
        {...props}
        sceneId={area.sceneId}
      />
    );
  }

  return <ExploreRunnerChapterOverlay {...props} />;
}

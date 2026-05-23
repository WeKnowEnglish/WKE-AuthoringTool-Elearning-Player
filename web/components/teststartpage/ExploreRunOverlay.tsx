"use client";

import { ExploreChapterOverlay } from "@/components/student-hub/ExploreChapterOverlay";

type Props = {
  muted: boolean;
  onClose: () => void;
  onRewardsGranted?: () => void;
};

/** Dev / test-start wrapper — production uses {@link ExploreChapterOverlay} on `/home`. */
export function ExploreRunOverlay({ muted, onClose, onRewardsGranted }: Props) {
  return (
    <ExploreChapterOverlay
      areaId="bedroom"
      sessionSeed="teststart-demo"
      muted={muted}
      onClose={onClose}
      onEconomyChange={onRewardsGranted}
    />
  );
}

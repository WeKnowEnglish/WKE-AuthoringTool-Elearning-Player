"use client";

import { GlobeScene } from "./GlobeScene";
import type { GlobePick } from "./GlobeControls";
import type { GlobeFocus } from "./look-at-hub";
import type { HomeSpotId, WorldSelection } from "./world-landmasses";

type Props = {
  className?: string;
  focus?: GlobeFocus | null;
  focusedLandmassId?: string | null;
  focusedSpot?: HomeSpotId | null;
  editMode?: boolean;
  selectedPlacementId?: string | null;
  onSelect?: (selection: WorldSelection | null) => void;
  onEditPick?: (placementId: string | null) => void;
  onEditMove?: (pick: GlobePick) => void;
};

/** Public shell: sized container + client-only R3F scene. */
export function WorldGlobe({
  className,
  focus,
  focusedLandmassId,
  focusedSpot,
  editMode,
  selectedPlacementId,
  onSelect,
  onEditPick,
  onEditMove,
}: Props) {
  return (
    <div
      className={className ?? "h-full w-full"}
      role="application"
      aria-label="WKE World globe"
      style={{ touchAction: "none", overscrollBehavior: "none", userSelect: "none" }}
    >
      <GlobeScene
        focus={focus}
        focusedLandmassId={focusedLandmassId}
        focusedSpot={focusedSpot}
        editMode={editMode}
        selectedPlacementId={selectedPlacementId}
        onSelect={onSelect}
        onEditPick={onEditPick}
        onEditMove={onEditMove}
      />
    </div>
  );
}

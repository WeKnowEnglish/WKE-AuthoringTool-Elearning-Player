"use client";

import { GlobeScene } from "./GlobeScene";
import type { GlobePick } from "./GlobeControls";
import type { GlobeFocus } from "./look-at-hub";
import type { HomeSpotId, WorldSelection } from "./world-landmasses";

type Stick = { x: number; z: number };

type Props = {
  className?: string;
  focus?: GlobeFocus | null;
  focusedLandmassId?: string | null;
  focusedSpot?: HomeSpotId | null;
  editMode?: boolean;
  selectedPlacementId?: string | null;
  walkMode?: boolean;
  spawnSpot?: HomeSpotId | null;
  spawnKey?: number;
  stick?: Stick;
  onSelect?: (selection: WorldSelection | null) => void;
  onEditPick?: (placementId: string | null) => void;
  onEditMove?: (pick: GlobePick) => void;
  onNearSpot?: (spot: HomeSpotId | null) => void;
};

/** Public shell: sized container + client-only R3F scene. */
export function WorldGlobe({
  className,
  focus,
  focusedLandmassId,
  focusedSpot,
  editMode,
  selectedPlacementId,
  walkMode,
  spawnSpot,
  spawnKey,
  stick,
  onSelect,
  onEditPick,
  onEditMove,
  onNearSpot,
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
        walkMode={walkMode}
        spawnSpot={spawnSpot}
        spawnKey={spawnKey}
        stick={stick}
        onSelect={onSelect}
        onEditPick={onEditPick}
        onEditMove={onEditMove}
        onNearSpot={onNearSpot}
      />
    </div>
  );
}

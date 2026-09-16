"use client";

import type { ComponentType, ReactNode } from "react";
import { HouseCampus, PetYardCampus, SchoolCampus } from "./campus";
import { FlowerPatchKit, PalmKit, RockClusterKit } from "./landmark-kits";
import { placeOnLandmass } from "./place-on-land";
import { SurfaceLandmark } from "./SurfaceLandmark";
import { useWorldPlacements } from "./WorldPlacementContext";
import { SpotLabel } from "./WorldLabel";
import { DEFAULT_WORLD_PLACEMENTS, type PlacementKit, type WorldPlacement } from "./world-placements";
import { landmassById, type HomeSpotId, type WorldLandmass } from "./world-landmasses";

const KITS: Record<PlacementKit, ComponentType> = {
  cottage: HouseCampus,
  school: SchoolCampus,
  pet: PetYardCampus,
  palm: PalmKit,
  rocks: RockClusterKit,
  flowers: FlowerPatchKit,
};

function Placed({
  landmass,
  placement,
  selected,
  children,
}: {
  landmass: WorldLandmass;
  placement: WorldPlacement;
  selected: boolean;
  children: ReactNode;
}) {
  const pose = placeOnLandmass(landmass, placement.localX, placement.localZ);
  return (
    <SurfaceLandmark
      lat={pose.lat}
      lon={pose.lon}
      radius={pose.radius}
      scale={placement.scale * (selected ? 1.08 : 1)}
      yaw={placement.yaw ?? landmass.yaw}
      name={placement.id}
      userData={{ landmassId: landmass.id, homeSpot: placement.spot, placementId: placement.id }}
    >
      {children}
    </SurfaceLandmark>
  );
}

export function HubLandmarks({
  focusedLandmassId,
  focusedSpot,
}: {
  focusedLandmassId?: string | null;
  focusedSpot?: HomeSpotId | null;
}) {
  const context = useWorldPlacements();
  const placements = context.placements.length > 0 ? context.placements : DEFAULT_WORLD_PLACEMENTS;
  const selectedId = context.selectedId;

  return (
    <group name="hub-landmarks">
      {placements.map((placement) => {
        const landmass = landmassById(placement.landmassId);
        if (!landmass) return null;
        const Kit = KITS[placement.kit];
        const showLabel = Boolean(placement.showLabel) && focusedLandmassId === placement.landmassId;
        return (
          <group key={placement.id}>
            <Placed landmass={landmass} placement={placement} selected={selectedId === placement.id}>
              <Kit />
            </Placed>
            {showLabel && placement.showLabel ? (
              <SpotLabel
                landmass={landmass}
                localX={placement.localX}
                localZ={placement.localZ}
                text={placement.showLabel}
                active={focusedSpot === placement.spot || selectedId === placement.id}
              />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

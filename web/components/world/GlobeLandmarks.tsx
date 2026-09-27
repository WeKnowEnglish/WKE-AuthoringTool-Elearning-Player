"use client";

import { HubBeacon } from "./HubBeacon";
import { HubHitVolume } from "./HubHitVolume";
import { HubLandmarks } from "./HubLandmarks";
import { WorldLabel } from "./WorldLabel";
import type { GlobeFocus } from "./look-at-hub";
import { landmassById, WORLD_HUBS, WORLD_LANDMASSES, type HomeSpotId } from "./world-landmasses";

/** Buildings and labels that ride the grass planet. */
export function GlobeLandmarks({
  focusedLandmassId,
  focusedSpot,
  focus,
}: {
  focusedLandmassId?: string | null;
  focusedSpot?: HomeSpotId | null;
  focus?: GlobeFocus | null;
}) {
  const focused = focusedLandmassId ? landmassById(focusedLandmassId) : undefined;
  return (
    <group name="landmarks">
      {WORLD_LANDMASSES.map((recipe) => (
        <HubHitVolume key={`hit-${recipe.id}`} landmass={recipe} />
      ))}
      <HubLandmarks focusedLandmassId={focusedLandmassId} focusedSpot={focusedSpot} />
      {focused && focus ? <HubBeacon lat={focus.lat} lon={focus.lon} name={`beacon-${focused.id}`} /> : null}
      {WORLD_HUBS.filter((hub) => !focusedLandmassId || hub.id === focusedLandmassId).map((hub) => (
        <WorldLabel
          key={`label-${hub.id}`}
          landmass={hub}
          facingDot={focusedLandmassId ? 0.42 : 0.05}
        />
      ))}
    </group>
  );
}

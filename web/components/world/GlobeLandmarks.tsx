"use client";

import { IslandLandmark } from "./IslandLandmark";

/** Locations that ride with `globeRoot`. Land wraps to the ocean sphere. */
export function GlobeLandmarks() {
  return (
    <group name="landmarks">
      <IslandLandmark />
    </group>
  );
}

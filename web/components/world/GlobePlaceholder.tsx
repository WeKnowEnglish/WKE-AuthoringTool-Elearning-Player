"use client";

import { GLOBE_RADIUS, OCEAN_COLOR } from "./globe-config";

/** Temporary ocean sphere. Landmarks sit on this surface via GlobeLandmarks. */
export function GlobePlaceholder() {
  return (
    <mesh name="ocean">
      <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
      <meshStandardMaterial color={OCEAN_COLOR} roughness={0.55} metalness={0.04} />
    </mesh>
  );
}

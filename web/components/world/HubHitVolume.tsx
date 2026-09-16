"use client";

import { GLOBE_RADIUS } from "./globe-config";
import { SurfaceLandmark } from "./SurfaceLandmark";
import type { WorldLandmass } from "./world-landmasses";

/** Invisible pick sphere so small hubs and houses are easy to tap. */
export function HubHitVolume({ landmass }: { landmass: WorldLandmass }) {
  const radius = Math.max(0.16, landmass.shelfRadius * 0.95);
  return (
    <SurfaceLandmark
      lat={landmass.lat}
      lon={landmass.lon}
      radius={GLOBE_RADIUS + 0.045}
      name={`hit-${landmass.id}`}
      userData={{ landmassId: landmass.id }}
    >
      <mesh visible={false} name={`hit-mesh-${landmass.id}`}>
        <sphereGeometry args={[radius, 12, 10]} />
        <meshBasicMaterial />
      </mesh>
    </SurfaceLandmark>
  );
}

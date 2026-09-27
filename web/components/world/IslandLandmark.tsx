"use client";

import { useLayoutEffect, useMemo } from "react";
import { DoubleSide, type BufferGeometry } from "three";
import { buildIslandGeometry } from "./build-island-geometry";
import { GLOBE_RADIUS } from "./globe-config";
import type { WorldLandmass } from "./world-landmasses";

export function Landmass({ recipe }: { recipe: WorldLandmass }) {
  const geometry = useMemo(
    () =>
      buildIslandGeometry({
        kind: recipe.kind,
        zone: recipe.zone,
        originLat: recipe.lat,
        originLon: recipe.lon,
        yaw: recipe.yaw,
        globeRadius: GLOBE_RADIUS,
        unitsToRadians: recipe.unitsToRadians,
        grid: recipe.grid,
        extent: recipe.extent,
      }),
    [recipe],
  );

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh
      name={`landmass-${recipe.id}`}
      geometry={geometry as BufferGeometry}
      userData={{ landmassId: recipe.id }}
    >
      <meshStandardMaterial vertexColors roughness={0.78} metalness={0} side={DoubleSide} />
    </mesh>
  );
}

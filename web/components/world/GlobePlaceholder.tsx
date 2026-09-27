"use client";

import { useLayoutEffect, useMemo } from "react";
import { buildPlanetGeometry } from "./build-planet-geometry";

/** Whole-planet grass with clay cliffs. Campus is a low meadow, not an island. */
export function GlobePlaceholder() {
  const geometry = useMemo(() => buildPlanetGeometry(), []);

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh name="planet" geometry={geometry} userData={{ landmassId: "home" }}>
      <meshStandardMaterial vertexColors roughness={0.88} metalness={0} />
    </mesh>
  );
}

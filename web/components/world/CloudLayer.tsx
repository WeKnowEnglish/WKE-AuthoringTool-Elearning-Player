"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { CLOUD_LOBES, DECORATIVE_CLOUDS, coverAround, type CloudClusterRecipe } from "./cloud-recipes";
import { SurfaceLandmark } from "./SurfaceLandmark";
import { WORLD_LANDMASSES } from "./world-landmasses";

function skipRaycast() {}

function CloudCluster({ recipe }: { recipe: CloudClusterRecipe }) {
  const lobes = CLOUD_LOBES[recipe.kind];
  return (
    <SurfaceLandmark
      lat={recipe.lat}
      lon={recipe.lon}
      radius={recipe.radius}
      yaw={recipe.yaw}
      name={`cloud-${recipe.kind}-${recipe.lat}-${recipe.lon}`}
    >
      {lobes.map((lobe, index) => (
        <mesh
          key={`${recipe.lat}-${recipe.lon}-${index}`}
          position={lobe.position}
          scale={lobe.scale}
          raycast={skipRaycast}
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial
            color={recipe.tint ?? "#f8fafc"}
            transparent
            opacity={recipe.opacity * (index === 0 ? 1 : 0.88)}
            depthWrite={false}
          />
        </mesh>
      ))}
    </SurfaceLandmark>
  );
}

const EAST = new Vector3();

export function CloudLayer() {
  const groupRef = useRef<Group>(null);
  const recipes = useMemo(() => {
    const locked = WORLD_LANDMASSES.filter((landmass) => landmass.locked).flatMap((landmass) =>
      coverAround(landmass.lat, landmass.lon),
    );
    return [...DECORATIVE_CLOUDS, ...locked];
  }, []);

  const bases = useMemo(
    () =>
      recipes.map((recipe) => ({
        origin: new Vector3(),
        east: new Vector3(Math.cos((recipe.lon * Math.PI) / 180), 0, -Math.sin((recipe.lon * Math.PI) / 180)),
      })),
    [recipes],
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const time = clock.elapsedTime * 0.07;
    group.children.forEach((child, index) => {
      const base = bases[index];
      if (!base) return;
      if (base.origin.lengthSq() === 0) {
        if (child.position.lengthSq() === 0) return;
        base.origin.copy(child.position);
      }
      EAST.copy(base.east).multiplyScalar(Math.sin(time + index * 0.65) * 0.016);
      child.position.copy(base.origin).add(EAST);
    });
  });

  return (
    <group ref={groupRef} name="cloud-layer">
      {recipes.map((recipe, index) => (
        <CloudCluster key={`${recipe.kind}-${recipe.lat}-${recipe.lon}-${index}`} recipe={recipe} />
      ))}
    </group>
  );
}

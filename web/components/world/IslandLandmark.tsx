"use client";

import { useLayoutEffect, useRef } from "react";
import { Vector3, type Mesh } from "three";
import { GLOBE_RADIUS } from "./globe-config";
import { ISLAND_LANDMARK, ISLAND_PARTS, type IslandPart } from "./island-parts";
import {
  authoredAngularRadius,
  authoredShellRadius,
  latLonToNormal,
  wrapAuthoredOffset,
} from "./sphere-wrap";

const LOCAL_UP = new Vector3(0, 1, 0);

/** One authored Studio unit becomes this many radians on the globe. */
const UNITS_TO_RADIANS = 0.3;
/** Upright props (palm, rock) keep a smaller world scale. */
const UPRIGHT_SCALE = 0.22;

const CAP_PARTS = new Set(["Beach", "Mainland", "Peninsula", "Hill", "Peak"]);

function isCapPart(part: IslandPart): boolean {
  return part.shape === "sphere" && CAP_PARTS.has(part.name);
}

function SphericalCap({
  name,
  radius,
  angularRadius,
  lat,
  lon,
  color,
  segments,
}: {
  name: string;
  radius: number;
  angularRadius: number;
  lat: number;
  lon: number;
  color: string;
  segments: number;
}) {
  const meshRef = useRef<Mesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.quaternion.setFromUnitVectors(LOCAL_UP, latLonToNormal(lat, lon));
  }, [lat, lon]);

  return (
    <mesh ref={meshRef} name={name}>
      <sphereGeometry args={[radius, segments, Math.max(8, segments - 4), 0, Math.PI * 2, 0, angularRadius]} />
      <meshStandardMaterial color={color} roughness={0.68} metalness={0} />
    </mesh>
  );
}

function UprightPart({ part }: { part: IslandPart }) {
  const meshRef = useRef<Mesh>(null);
  const wrapped = wrapAuthoredOffset(
    ISLAND_LANDMARK.lat,
    ISLAND_LANDMARK.lon,
    part.position[0],
    part.position[2],
    ISLAND_LANDMARK.yaw,
    UNITS_TO_RADIANS,
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const lift =
      part.shape === "cylinder" ? (part.height ?? 1) * UPRIGHT_SCALE * 0.5 : part.position[1] * UPRIGHT_SCALE;
    mesh.position.copy(wrapped.normal).multiplyScalar(GLOBE_RADIUS + lift);
    mesh.quaternion.setFromUnitVectors(LOCAL_UP, wrapped.normal);
    mesh.scale.set(part.scale[0] * UPRIGHT_SCALE, part.scale[1] * UPRIGHT_SCALE, part.scale[2] * UPRIGHT_SCALE);
  }, [part, wrapped.normal]);

  return (
    <mesh ref={meshRef} name={part.name}>
      {part.shape === "cylinder" ? (
        <cylinderGeometry
          args={[part.radiusTop ?? part.radius, part.radiusBottom ?? part.radius, part.height ?? 1, part.segments]}
        />
      ) : (
        <sphereGeometry args={[part.radius, part.segments, Math.max(8, Math.round(part.segments * 0.75))]} />
      )}
      <meshStandardMaterial color={part.color} roughness={0.7} metalness={0} />
    </mesh>
  );
}

/**
 * Studio World island, wrapped onto the ocean sphere.
 * Land blobs are concentric spherical caps so they follow globe curvature.
 * Palm and rock stay upright on the local surface.
 */
export function IslandLandmark() {
  return (
    <group name="world-island">
      {ISLAND_PARTS.map((part) => {
        if (isCapPart(part)) {
          const wrapped = wrapAuthoredOffset(
            ISLAND_LANDMARK.lat,
            ISLAND_LANDMARK.lon,
            part.position[0],
            part.position[2],
            ISLAND_LANDMARK.yaw,
            UNITS_TO_RADIANS,
          );
          return (
            <SphericalCap
              key={part.name}
              name={part.name}
              radius={authoredShellRadius(GLOBE_RADIUS, part.position[1])}
              angularRadius={authoredAngularRadius(Math.max(part.scale[0], part.scale[2]) * part.radius, UNITS_TO_RADIANS)}
              lat={wrapped.lat}
              lon={wrapped.lon}
              color={part.color}
              segments={part.segments + 8}
            />
          );
        }

        return <UprightPart key={part.name} part={part} />;
      })}
    </group>
  );
}

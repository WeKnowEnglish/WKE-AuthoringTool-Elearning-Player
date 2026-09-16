"use client";

import { useMemo } from "react";
import { DoubleSide, Vector2 } from "three";
import { makeShape, roundedRectPoints, trianglePoints, type Vec2 } from "./campus-geometry";

export type MeshTone = {
  color: string;
  roughness?: number;
};

function ToyMaterial({ tone }: { tone: MeshTone }) {
  return <meshStandardMaterial color={tone.color} roughness={tone.roughness ?? 0.72} metalness={0} />;
}

export function Box({
  args,
  position,
  rotation,
  tone,
}: {
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={false}>
      <boxGeometry args={args} />
      <ToyMaterial tone={tone} />
    </mesh>
  );
}

export function Sphere({
  radius,
  args,
  position,
  scale,
  tone,
}: {
  radius?: number;
  args?: [number, number, number];
  position?: [number, number, number];
  scale?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={args ?? [radius ?? 1, 12, 10]} />
      <ToyMaterial tone={{ color: tone.color, roughness: tone.roughness ?? 0.7 }} />
    </mesh>
  );
}

export function Cylinder({
  args,
  position,
  rotation,
  tone,
}: {
  args: [number, number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={args} />
      <ToyMaterial tone={{ color: tone.color, roughness: tone.roughness ?? 0.7 }} />
    </mesh>
  );
}

export function Cone({
  args,
  position,
  rotation,
  tone,
}: {
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <coneGeometry args={args} />
      <ToyMaterial tone={{ color: tone.color, roughness: tone.roughness ?? 0.68 }} />
    </mesh>
  );
}

export function Capsule({
  args,
  position,
  rotation,
  tone,
}: {
  args: [number, number, number?, number?];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={args} />
      <ToyMaterial tone={tone} />
    </mesh>
  );
}

/** 2D silhouette extruded along +Z. Holes become openings in the wall. */
export function Silhouette({
  outline,
  holes,
  depth = 0.08,
  bevel = false,
  bevelSize = 0.01,
  position,
  rotation,
  tone,
}: {
  outline: readonly Vec2[];
  holes?: readonly (readonly Vec2[])[];
  depth?: number;
  bevel?: boolean;
  bevelSize?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  const shape = useMemo(
    () => makeShape({ outline, holes }),
    // Specs are small literals; stringify keeps ExtrudeGeometry stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(outline), JSON.stringify(holes ?? [])],
  );
  return (
    <mesh position={position} rotation={rotation}>
      <extrudeGeometry
        args={[
          shape,
          {
            depth,
            bevelEnabled: bevel,
            bevelThickness: bevel ? bevelSize : 0,
            bevelSize: bevel ? bevelSize : 0,
            bevelSegments: bevel ? 1 : 0,
            steps: 1,
          },
        ]}
      />
      <ToyMaterial tone={tone} />
    </mesh>
  );
}

/** Profile in [radius, y], spun around Y. */
export function Lathe({
  profile,
  segments = 16,
  position,
  rotation,
  tone,
}: {
  profile: readonly Vec2[];
  segments?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  const points = useMemo(
    () => profile.map((point) => new Vector2(Math.max(0, point[0]), point[1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(profile)],
  );
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <latheGeometry args={[points, segments]} />
      <ToyMaterial tone={tone} />
    </mesh>
  );
}

export function Plane({
  args,
  position,
  rotation,
  tone,
}: {
  args: [number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={args} />
      <meshStandardMaterial
        color={tone.color}
        roughness={tone.roughness ?? 0.72}
        metalness={0}
        side={DoubleSide}
      />
    </mesh>
  );
}

/** Isosceles triangular prism. Base sits on Y=0; extrudes along +Z. */
export function Prism({
  width,
  height,
  depth,
  position,
  rotation,
  tone,
}: {
  width: number;
  height: number;
  depth: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  return (
    <Silhouette
      outline={trianglePoints(width, height)}
      depth={depth}
      position={position}
      rotation={rotation}
      tone={tone}
    />
  );
}

/** Clay box with rounded corners, centered like Box. */
export function RoundedBox({
  args,
  radius = 0.04,
  position,
  rotation,
  tone,
}: {
  args: [number, number, number];
  radius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  tone: MeshTone;
}) {
  const [width, height, depth] = args;
  const rad = Math.min(radius, width / 4, height / 4, depth / 4);
  return (
    <group position={position} rotation={rotation}>
      <Silhouette
        outline={roundedRectPoints(0, 0, width, height, rad)}
        depth={depth}
        position={[0, 0, -depth / 2]}
        tone={tone}
      />
    </group>
  );
}

"use client";

type MeshTone = {
  color: string;
  roughness?: number;
};

function Box({
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
      <meshStandardMaterial color={tone.color} roughness={tone.roughness ?? 0.72} metalness={0} />
    </mesh>
  );
}

function Sphere({
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
      <meshStandardMaterial color={tone.color} roughness={tone.roughness ?? 0.7} metalness={0} />
    </mesh>
  );
}

function Cylinder({
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
      <meshStandardMaterial color={tone.color} roughness={tone.roughness ?? 0.7} metalness={0} />
    </mesh>
  );
}

function Cone({
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
      <meshStandardMaterial color={tone.color} roughness={tone.roughness ?? 0.68} metalness={0} />
    </mesh>
  );
}

export { HouseCampus as CottageKit } from "./campus/HouseCampus";

/** Story library — white hall, oversized navy roof, gold peak, and side books. */
export function LibraryKit() {
  return (
    <group name="library">
      <Box args={[1.12, 0.88, 0.92]} position={[0, 0.44, 0]} tone={{ color: "#f8fafc" }} />
      <mesh position={[0, 1.18, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.22, 0.92, 4]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.58} metalness={0} />
      </mesh>
      <Box args={[0.28, 0.28, 0.28]} position={[0, 1.68, 0]} tone={{ color: "#fbbf24" }} />
      <Cylinder args={[0.08, 0.08, 0.88, 8]} position={[-0.5, 0.44, 0.46]} tone={{ color: "#fef3c7" }} />
      <Cylinder args={[0.08, 0.08, 0.88, 8]} position={[0.5, 0.44, 0.46]} tone={{ color: "#fef3c7" }} />
      <Box args={[0.7, 0.22, 0.1]} position={[0, 0.86, 0.5]} tone={{ color: "#fbbf24" }} />
      <Box args={[0.32, 0.62, 0.1]} position={[0, 0.34, 0.5]} tone={{ color: "#1e3a8a" }} />
      <Box args={[0.28, 0.3, 0.08]} position={[-0.34, 0.6, 0.5]} tone={{ color: "#7dd3fc" }} />
      <Box args={[0.28, 0.3, 0.08]} position={[0.34, 0.6, 0.5]} tone={{ color: "#7dd3fc" }} />
      <Box args={[0.34, 0.16, 0.22]} position={[-0.82, 0.16, 0.18]} tone={{ color: "#ef4444" }} />
      <Box args={[0.32, 0.14, 0.2]} position={[-0.78, 0.3, 0.16]} tone={{ color: "#22c55e" }} />
      <Box args={[0.3, 0.12, 0.18]} position={[-0.8, 0.42, 0.14]} tone={{ color: "#3b82f6" }} />
      <Box args={[0.28, 0.12, 0.16]} position={[0.78, 0.16, 0.16]} tone={{ color: "#f97316" }} />
    </group>
  );
}

/** Bright playhouse with a round window and a flag. */
export function PlayhouseKit() {
  return (
    <group name="playhouse">
      <Box args={[0.92, 0.78, 0.92]} position={[0, 0.39, 0]} tone={{ color: "#fde047" }} />
      <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.02, 0.7, 4]} />
        <meshStandardMaterial color="#ec4899" roughness={0.62} metalness={0} />
      </mesh>
      <Box args={[0.3, 0.46, 0.1]} position={[0, 0.28, 0.54]} tone={{ color: "#16a34a" }} />
      <Sphere radius={0.2} position={[-0.32, 0.52, 0.54]} tone={{ color: "#7dd3fc" }} />
      <Sphere radius={0.2} position={[0.32, 0.52, 0.54]} tone={{ color: "#7dd3fc" }} />
      <Cylinder args={[0.04, 0.04, 0.85, 8]} position={[0.46, 1.22, 0.1]} tone={{ color: "#a3a3a3" }} />
      <Box args={[0.28, 0.18, 0.05]} position={[0.62, 1.52, 0.1]} tone={{ color: "#f97316" }} />
      <Sphere radius={0.18} position={[0.78, 0.16, 0.46]} tone={{ color: "#f43f5e" }} />
    </group>
  );
}

/** Teal tent camp with a second tent, flag, and a readable campfire. */
export function CampKit() {
  return (
    <group name="camp">
      <Cone args={[0.78, 1.05, 5]} position={[0, 0.52, 0]} tone={{ color: "#14b8a6" }} />
      <Cone args={[0.3, 0.24, 5]} position={[0, 1.0, 0]} tone={{ color: "#0f766e" }} />
      <Box args={[0.26, 0.36, 0.05]} position={[0, 0.22, 0.54]} tone={{ color: "#fef3c7" }} />
      <Cone args={[0.42, 0.58, 5]} position={[-0.72, 0.3, -0.28]} tone={{ color: "#f97316" }} />
      <Cylinder args={[0.035, 0.035, 0.95, 8]} position={[0.7, 0.48, 0.16]} tone={{ color: "#a3a3a3" }} />
      <Box args={[0.26, 0.16, 0.05]} position={[0.84, 0.88, 0.16]} tone={{ color: "#ef4444" }} />
      <Cylinder args={[0.05, 0.05, 0.28, 6]} position={[-0.62, 0.08, 0.48]} rotation={[0, 0, 1.2]} tone={{ color: "#78716c" }} />
      <Cylinder args={[0.045, 0.045, 0.24, 6]} position={[-0.48, 0.07, 0.56]} rotation={[0.2, 0.4, -0.8]} tone={{ color: "#57534e" }} />
      <Sphere radius={0.12} position={[-0.56, 0.16, 0.5]} tone={{ color: "#fb923c" }} />
      <Sphere radius={0.08} position={[-0.5, 0.22, 0.56]} tone={{ color: "#facc15" }} />
      <Sphere radius={0.07} position={[-0.62, 0.2, 0.54]} tone={{ color: "#f97316" }} />
    </group>
  );
}

export { SchoolCampus as SchoolKit } from "./campus/SchoolCampus";

export { PetYardCampus as PetYardKit } from "./campus/PetYardCampus";

/** Fuller palm: bent trunk, layered leaves, coconuts. */
export function PalmKit() {
  return (
    <group name="palm">
      <Cylinder args={[0.07, 0.1, 0.55, 8]} position={[0.02, 0.28, 0]} rotation={[0.12, 0, 0.08]} tone={{ color: "#a16207" }} />
      <Cylinder args={[0.055, 0.075, 0.48, 8]} position={[0.08, 0.72, 0.04]} rotation={[0.18, 0.2, 0.1]} tone={{ color: "#92400e" }} />
      <Sphere scale={[0.42, 0.13, 0.42]} position={[0.12, 1.02, 0.04]} tone={{ color: "#15803d" }} />
      <Sphere scale={[0.34, 0.1, 0.18]} position={[0.38, 0.98, 0.06]} tone={{ color: "#16a34a" }} />
      <Sphere scale={[0.32, 0.1, 0.17]} position={[-0.14, 0.98, 0.16]} tone={{ color: "#22c55e" }} />
      <Sphere scale={[0.3, 0.09, 0.16]} position={[0.08, 1.0, -0.2]} tone={{ color: "#15803d" }} />
      <Sphere scale={[0.26, 0.08, 0.15]} position={[0.24, 0.94, 0.24]} tone={{ color: "#4ade80" }} />
      <Sphere scale={[0.24, 0.08, 0.14]} position={[-0.06, 0.94, -0.12]} tone={{ color: "#166534" }} />
      <Sphere radius={0.055} position={[0.08, 0.92, 0.1]} tone={{ color: "#78350f" }} />
      <Sphere radius={0.05} position={[0.16, 0.9, 0.02]} tone={{ color: "#92400e" }} />
      <Sphere radius={0.045} position={[0.04, 0.9, -0.02]} tone={{ color: "#a16207" }} />
    </group>
  );
}

export function PineKit() {
  return (
    <group name="pine">
      <Cylinder args={[0.06, 0.08, 0.28, 8]} position={[0, 0.14, 0]} tone={{ color: "#92400e" }} />
      <Cone args={[0.28, 0.38, 7]} position={[0, 0.42, 0]} tone={{ color: "#166534" }} />
      <Cone args={[0.22, 0.3, 7]} position={[0, 0.62, 0]} tone={{ color: "#15803d" }} />
      <Cone args={[0.14, 0.22, 7]} position={[0, 0.8, 0]} tone={{ color: "#22c55e" }} />
    </group>
  );
}

export function RockClusterKit() {
  return (
    <group name="rocks">
      <Sphere scale={[0.22, 0.14, 0.18]} position={[0, 0.08, 0]} tone={{ color: "#78716c" }} />
      <Sphere scale={[0.14, 0.1, 0.12]} position={[0.16, 0.06, 0.08]} tone={{ color: "#a8a29e" }} />
      <Sphere scale={[0.1, 0.08, 0.1]} position={[-0.12, 0.05, 0.1]} tone={{ color: "#57534e" }} />
    </group>
  );
}

export function FlowerPatchKit() {
  return (
    <group name="flowers">
      <Sphere radius={0.12} position={[0, 0.1, 0]} tone={{ color: "#f472b6" }} />
      <Sphere radius={0.1} position={[0.16, 0.09, 0.06]} tone={{ color: "#facc15" }} />
      <Sphere radius={0.09} position={[-0.14, 0.08, 0.12]} tone={{ color: "#fb7185" }} />
      <Sphere radius={0.08} position={[0.08, 0.08, -0.12]} tone={{ color: "#ffffff" }} />
      <Sphere radius={0.075} position={[-0.16, 0.07, -0.06]} tone={{ color: "#a78bfa" }} />
    </group>
  );
}

export function DockKit() {
  return (
    <group name="dock">
      <Box args={[0.85, 0.08, 0.38]} position={[0, 0.1, 0]} tone={{ color: "#d6a36a" }} />
      <Box args={[0.82, 0.03, 0.08]} position={[0, 0.15, -0.1]} tone={{ color: "#b45309" }} />
      <Box args={[0.82, 0.03, 0.08]} position={[0, 0.15, 0.1]} tone={{ color: "#b45309" }} />
      <Cylinder args={[0.05, 0.06, 0.28, 8]} position={[-0.32, 0, 0.14]} tone={{ color: "#78716c" }} />
      <Cylinder args={[0.05, 0.06, 0.28, 8]} position={[0.32, 0, 0.14]} tone={{ color: "#78716c" }} />
    </group>
  );
}

export function BuoyKit({ color }: { color: string }) {
  return (
    <group name="buoy">
      <Sphere radius={0.16} position={[0, 0.14, 0]} tone={{ color }} />
      <Cylinder args={[0.03, 0.03, 0.22, 8]} position={[0, 0.28, 0]} tone={{ color: "#f8fafc" }} />
      <Sphere radius={0.05} position={[0, 0.4, 0]} tone={{ color: "#fbbf24" }} />
    </group>
  );
}

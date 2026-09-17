"use client";

import { Box, Cylinder, Sphere } from "./campus-primitives";

/** Fenced yard with a kennel, bowl, and a small pet. */
export function PetYardCampus() {
  return (
    <group name="pet-yard">
      <Box args={[1.55, 0.16, 0.06]} position={[0, 0.12, -0.64]} tone={{ color: "#d6d3d1" }} />
      <Box args={[1.55, 0.16, 0.06]} position={[0, 0.12, 0.64]} tone={{ color: "#d6d3d1" }} />
      <Box args={[0.06, 0.16, 1.28]} position={[-0.74, 0.12, 0]} tone={{ color: "#d6d3d1" }} />
      <Box args={[0.06, 0.16, 0.42]} position={[0.74, 0.12, -0.4]} tone={{ color: "#d6d3d1" }} />
      <Box args={[0.06, 0.16, 0.42]} position={[0.74, 0.12, 0.4]} tone={{ color: "#d6d3d1" }} />
      <Box args={[0.48, 0.32, 0.42]} position={[-0.28, 0.22, -0.18]} tone={{ color: "#fdba74" }} />
      <mesh position={[-0.28, 0.5, -0.18]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.38, 0.28, 4]} />
        <meshStandardMaterial color="#b45309" roughness={0.64} metalness={0} />
      </mesh>
      <Box args={[0.12, 0.16, 0.04]} position={[-0.28, 0.14, 0.04]} tone={{ color: "#78350f" }} />
      <Cylinder args={[0.08, 0.1, 0.06, 10]} position={[0.22, 0.08, 0.28]} tone={{ color: "#e5e7eb" }} />
      <Sphere radius={0.09} position={[0.22, 0.1, 0.28]} tone={{ color: "#38bdf8" }} />
      <Sphere radius={0.16} position={[0.28, 0.16, -0.06]} tone={{ color: "#fb923c" }} />
      <Sphere radius={0.11} position={[0.4, 0.24, -0.02]} tone={{ color: "#fdba74" }} />
      <Sphere radius={0.035} position={[0.46, 0.28, 0.04]} tone={{ color: "#1f2937" }} />
      <Sphere radius={0.035} position={[0.48, 0.28, -0.06]} tone={{ color: "#1f2937" }} />
      <Cylinder args={[0.025, 0.03, 0.12, 6]} position={[0.18, 0.08, -0.16]} rotation={[0.6, 0, 0.2]} tone={{ color: "#ea580c" }} />
      <mesh visible={false} position={[0, 0.28, 0]} name="pet-hit">
        <boxGeometry args={[1.6, 0.6, 1.4]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

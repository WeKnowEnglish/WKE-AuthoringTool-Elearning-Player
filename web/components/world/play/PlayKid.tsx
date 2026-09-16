"use client";

import { Box, Cylinder, Sphere } from "../campus/campus-primitives";

export function PlayKid() {
  return (
    <group name="play-kid">
      <Sphere radius={0.16} position={[0, 1.08, 0.02]} tone={{ color: "#f2c9a1" }} />
      <Cylinder args={[0.15, 0.18, 0.5, 10]} position={[0, 0.64, 0]} tone={{ color: "#38bdf8" }} />
      <Cylinder args={[0.05, 0.06, 0.42, 8]} position={[-0.12, 0.22, 0]} tone={{ color: "#1d4ed8" }} />
      <Cylinder args={[0.05, 0.06, 0.42, 8]} position={[0.12, 0.22, 0]} tone={{ color: "#1d4ed8" }} />
      <Sphere radius={0.07} position={[-0.12, 0.02, 0.04]} tone={{ color: "#0f172a" }} />
      <Sphere radius={0.07} position={[0.12, 0.02, 0.04]} tone={{ color: "#0f172a" }} />
    </group>
  );
}

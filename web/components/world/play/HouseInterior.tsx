"use client";

import { Box } from "../campus/campus-primitives";
import { PlayGltf } from "./PlayGltf";
import { PatternedBox } from "./room-surfaces";

const TRIM = "#f8fafc";

export const FRIDGE_SRC = "/world/props/kitchen/fridge.gltf";

export function HouseInterior() {
  return (
    <group name="house-interior">
      <PatternedBox args={[10.4, 0.12, 10.4]} position={[0, -0.06, 0]} kind="wood" roughness={0.9} />
      <PatternedBox args={[10.6, 3.1, 0.28]} position={[0, 1.5, -5.15]} kind="stripes" />
      <PatternedBox args={[0.28, 3.1, 10.6]} position={[-5.15, 1.5, 0]} kind="stripes" />
      <PatternedBox args={[0.28, 3.1, 10.6]} position={[5.15, 1.5, 0]} kind="stripes" />
      <PatternedBox args={[4.2, 3.1, 0.28]} position={[-3.2, 1.5, 5.15]} kind="stripes" />
      <PatternedBox args={[4.2, 3.1, 0.28]} position={[3.2, 1.5, 5.15]} kind="stripes" />
      <Box args={[2.4, 0.28, 0.28]} position={[0, 2.86, 5.15]} tone={{ color: TRIM }} />
      <PlayGltf src={FRIDGE_SRC} position={[3.35, 0, -3.85]} rotation={[0, -Math.PI / 2, 0]} scale={0.62} ground={false} />
    </group>
  );
}

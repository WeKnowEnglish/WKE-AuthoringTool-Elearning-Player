"use client";

import type { ReactNode } from "react";
import { Box, Cylinder, Sphere } from "../world/campus/campus-primitives";
import { PlayGltf } from "../world/play/PlayGltf";
import { FURNITURE } from "@/lib/house/house-catalog";
import type { HouseFurnitureId, HouseRot } from "@/lib/house/house-types";

function Clay({
  children,
  selected,
  radius,
}: {
  children: ReactNode;
  selected?: boolean;
  radius: number;
}) {
  return (
    <group>
      {children}
      {selected ? (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.14, 24]} />
          <meshBasicMaterial color="#facc15" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

export function HouseFurnitureMesh({
  kind,
  rot,
  selected,
}: {
  kind: HouseFurnitureId;
  rot: HouseRot;
  selected?: boolean;
}) {
  const span = Math.max(...FURNITURE[kind].footprint) * 0.52;
  return (
    <group rotation={[0, rot * (Math.PI / 2), 0]}>
      <Clay selected={selected} radius={span}>
        {kind === "fridge" ? (
          <PlayGltf src={FURNITURE.fridge.src!} position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.62} ground={false} />
        ) : null}
        {kind === "bed" ? (
          <>
            <Box args={[2, 0.28, 2.4]} position={[0, 0.22, 0]} tone={{ color: "#60a5fa", roughness: 0.88 }} />
            <Box args={[1.9, 0.12, 0.55]} position={[0, 0.42, -0.85]} tone={{ color: "#fde68a", roughness: 0.8 }} />
            <Box args={[2.05, 0.18, 2.45]} position={[0, 0.08, 0]} tone={{ color: "#92400e", roughness: 0.86 }} />
          </>
        ) : null}
        {kind === "table" ? (
          <>
            <Box args={[1.45, 0.1, 1.45]} position={[0, 0.62, 0]} tone={{ color: "#b45309", roughness: 0.82 }} />
            <Box args={[0.12, 0.58, 0.12]} position={[-0.58, 0.29, -0.58]} tone={{ color: "#78350f" }} />
            <Box args={[0.12, 0.58, 0.12]} position={[0.58, 0.29, -0.58]} tone={{ color: "#78350f" }} />
            <Box args={[0.12, 0.58, 0.12]} position={[-0.58, 0.29, 0.58]} tone={{ color: "#78350f" }} />
            <Box args={[0.12, 0.58, 0.12]} position={[0.58, 0.29, 0.58]} tone={{ color: "#78350f" }} />
          </>
        ) : null}
        {kind === "chair" ? (
          <>
            <Box args={[0.48, 0.08, 0.48]} position={[0, 0.38, 0]} tone={{ color: "#f59e0b" }} />
            <Box args={[0.48, 0.46, 0.08]} position={[0, 0.64, -0.2]} tone={{ color: "#d97706" }} />
            <Box args={[0.08, 0.34, 0.08]} position={[-0.16, 0.17, -0.16]} tone={{ color: "#92400e" }} />
            <Box args={[0.08, 0.34, 0.08]} position={[0.16, 0.17, -0.16]} tone={{ color: "#92400e" }} />
            <Box args={[0.08, 0.34, 0.08]} position={[-0.16, 0.17, 0.16]} tone={{ color: "#92400e" }} />
            <Box args={[0.08, 0.34, 0.08]} position={[0.16, 0.17, 0.16]} tone={{ color: "#92400e" }} />
          </>
        ) : null}
        {kind === "shelf" ? (
          <>
            <Box args={[1.45, 1.35, 0.12]} position={[0, 0.7, 0]} tone={{ color: "#a16207" }} />
            <Box args={[1.4, 0.06, 0.36]} position={[0, 0.28, 0.12]} tone={{ color: "#fef3c7" }} />
            <Box args={[1.4, 0.06, 0.36]} position={[0, 0.68, 0.12]} tone={{ color: "#fef3c7" }} />
            <Box args={[1.4, 0.06, 0.36]} position={[0, 1.08, 0.12]} tone={{ color: "#fef3c7" }} />
          </>
        ) : null}
        {kind === "plant" ? (
          <>
            <Cylinder args={[0.16, 0.2, 0.28, 10]} position={[0, 0.14, 0]} tone={{ color: "#b45309" }} />
            <Sphere radius={0.28} position={[0, 0.52, 0]} tone={{ color: "#22c55e", roughness: 0.9 }} />
          </>
        ) : null}
        {kind === "rug" ? <Box args={[2, 0.05, 1.45]} position={[0, 0.03, 0]} tone={{ color: "#ef4444", roughness: 0.95 }} /> : null}
      </Clay>
    </group>
  );
}

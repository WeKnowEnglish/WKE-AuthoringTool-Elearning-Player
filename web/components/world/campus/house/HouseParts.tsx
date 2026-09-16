"use client";

import {
  archPoints,
  circlePoints,
  gableOutline,
  heartPoints,
  rectPoints,
} from "../campus-geometry";
import { Box, Cone, Cylinder, Silhouette, Sphere } from "../campus-primitives";

const WALL = "#e8eef4";
const STONE = "#c5d0dc";
const STONE_DEEP = "#94a3b8";
const ROOF = "#f97316";
const ROOF_DEEP = "#ea580c";
const DOOR = "#38bdf8";
const GLASS = "#1e3a8a";
const WOOD = "#d97706";
const WOOD_DEEP = "#b45309";
const PATH = "#cbd5e1";
const LEAF = "#4d7c0f";
const FRAME = "#f8fafc";
const HEART_GLASS = "#bae6fd";
const GOLD = "#fbbf24";

const ROOF_PITCH = 0.62;
const WIDTH = 1.08;
const BASE_Y = 0.12;
const WALL_H = 0.7;
const GABLE_H = 0.42;
const FRONT = gableOutline(WIDTH, BASE_Y, WALL_H, GABLE_H);
const DOOR_HOLE = archPoints(0, BASE_Y + 0.02, 0.32, 0.46);
const WINDOW_L = rectPoints(-0.33, 0.48, 0.2, 0.2);
const WINDOW_R = rectPoints(0.33, 0.48, 0.2, 0.2);
const HEART_HOLE = heartPoints(0, 0.98, 0.15);
const DOOR_WINDOW = circlePoints(0, 0.48, 0.055, 16);

function SquareWindow({
  position,
  rotation,
  width = 0.2,
  height = 0.2,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[width + 0.07, height + 0.07, 0.05]} tone={{ color: FRAME }} />
      <Box args={[width, height, 0.06]} position={[0, 0, 0.012]} tone={{ color: GLASS }} />
    </group>
  );
}

export function HouseBody() {
  return (
    <group name="house-body">
      <Box args={[1.22, 0.12, 1.02]} position={[0, 0.06, 0]} tone={{ color: STONE }} />
      <Box args={[1.02, 0.66, 0.78]} position={[0, 0.45, -0.04]} tone={{ color: WALL }} />
      <mesh position={[0, 1.02, -0.04]}>
        <coneGeometry args={[0.5, 0.46, 4]} />
        <meshStandardMaterial color={WALL} roughness={0.72} metalness={0} />
      </mesh>
      <Silhouette
        outline={FRONT}
        holes={[DOOR_HOLE, WINDOW_L, WINDOW_R, HEART_HOLE]}
        depth={0.1}
        position={[0, 0, 0.42]}
        tone={{ color: WALL, roughness: 0.7 }}
      />
      <Silhouette
        outline={FRONT}
        depth={0.08}
        position={[0, 0, -0.42]}
        rotation={[0, Math.PI, 0]}
        tone={{ color: WALL, roughness: 0.7 }}
      />
    </group>
  );
}

export function HouseRoof() {
  return (
    <group name="house-roof">
      <Box
        args={[0.9, 0.09, 1.14]}
        position={[-0.3, 1.06, 0]}
        rotation={[0, 0, ROOF_PITCH]}
        tone={{ color: ROOF, roughness: 0.55 }}
      />
      <Box
        args={[0.9, 0.09, 1.14]}
        position={[0.3, 1.06, 0]}
        rotation={[0, 0, -ROOF_PITCH]}
        tone={{ color: ROOF, roughness: 0.55 }}
      />
      <Box args={[0.12, 0.05, 1.16]} position={[0, 1.29, 0]} tone={{ color: ROOF_DEEP, roughness: 0.5 }} />
      <Box
        args={[0.78, 0.055, 0.055]}
        position={[-0.28, 1.06, 0.57]}
        rotation={[0, 0, ROOF_PITCH]}
        tone={{ color: ROOF_DEEP }}
      />
      <Box
        args={[0.78, 0.055, 0.055]}
        position={[0.28, 1.06, 0.57]}
        rotation={[0, 0, -ROOF_PITCH]}
        tone={{ color: ROOF_DEEP }}
      />
    </group>
  );
}

export function HouseChimney() {
  return (
    <group name="house-chimney">
      <Box args={[0.15, 0.18, 0.15]} position={[0.4, 1.12, -0.12]} tone={{ color: STONE_DEEP }} />
      <Box args={[0.19, 0.04, 0.19]} position={[0.4, 1.22, -0.12]} tone={{ color: STONE }} />
    </group>
  );
}

export function HouseDoor() {
  return (
    <group name="house-door">
      <Silhouette
        outline={DOOR_HOLE}
        holes={[DOOR_WINDOW]}
        depth={0.06}
        position={[0, 0, 0.43]}
        tone={{ color: DOOR }}
      />
      <Silhouette outline={circlePoints(0, 0.48, 0.045, 16)} depth={0.03} position={[0, 0, 0.44]} tone={{ color: GLASS, roughness: 0.35 }} />
      <Sphere radius={0.032} position={[0.1, 0.28, 0.52]} tone={{ color: GOLD }} />
    </group>
  );
}

export function HouseWindows() {
  return (
    <group name="house-windows">
      <Silhouette outline={WINDOW_L} depth={0.04} position={[0, 0, 0.43]} tone={{ color: GLASS, roughness: 0.35 }} />
      <Silhouette outline={WINDOW_R} depth={0.04} position={[0, 0, 0.43]} tone={{ color: GLASS, roughness: 0.35 }} />
      <Silhouette outline={HEART_HOLE} depth={0.04} position={[0, 0, 0.43]} tone={{ color: HEART_GLASS, roughness: 0.4 }} />
      <SquareWindow position={[0.55, 0.48, 0.12]} rotation={[0, Math.PI / 2, 0]} width={0.16} height={0.16} />
    </group>
  );
}

export function HousePlanters() {
  return (
    <group name="house-planters">
      <Box args={[0.28, 0.08, 0.1]} position={[-0.33, 0.24, 0.53]} tone={{ color: WOOD }} />
      <Sphere radius={0.045} position={[-0.4, 0.32, 0.53]} tone={{ color: "#fb7185" }} />
      <Sphere radius={0.04} position={[-0.33, 0.33, 0.55]} tone={{ color: "#fde047" }} />
      <Sphere radius={0.038} position={[-0.26, 0.32, 0.53]} tone={{ color: "#ffffff" }} />
      <Box args={[0.28, 0.08, 0.1]} position={[0.33, 0.24, 0.53]} tone={{ color: WOOD }} />
      <Sphere radius={0.045} position={[0.26, 0.32, 0.53]} tone={{ color: "#f472b6" }} />
      <Sphere radius={0.04} position={[0.33, 0.33, 0.55]} tone={{ color: "#4ade80" }} />
      <Sphere radius={0.038} position={[0.4, 0.32, 0.53]} tone={{ color: GOLD }} />
    </group>
  );
}

export function HouseMailbox() {
  return (
    <group name="house-mailbox" position={[-0.78, 0, 0.72]}>
      <Cylinder args={[0.025, 0.03, 0.28, 8]} position={[0, 0.14, 0]} tone={{ color: STONE_DEEP }} />
      <Box args={[0.16, 0.1, 0.1]} position={[0.02, 0.3, 0]} tone={{ color: GOLD }} />
      <Box args={[0.05, 0.03, 0.02]} position={[0.09, 0.35, 0]} tone={{ color: "#ef4444" }} />
    </group>
  );
}

export function HousePath() {
  return (
    <group name="house-path">
      <Box args={[0.28, 0.04, 0.18]} position={[0, 0.03, 0.64]} tone={{ color: PATH }} />
      <Box args={[0.24, 0.035, 0.16]} position={[0.03, 0.03, 0.82]} tone={{ color: STONE }} />
      <Box args={[0.22, 0.03, 0.14]} position={[-0.02, 0.03, 0.98]} tone={{ color: PATH }} />
    </group>
  );
}

function Picket({ x, z = 0.92 }: { x: number; z?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box args={[0.045, 0.28, 0.045]} position={[0, 0.2, 0]} tone={{ color: WOOD }} />
      <Cone args={[0.032, 0.07, 4]} position={[0, 0.37, 0]} tone={{ color: WOOD }} />
    </group>
  );
}

export function HousePorch() {
  return (
    <group name="house-porch">
      <Box args={[1.7, 0.05, 0.06]} position={[0, 0.14, 0.92]} tone={{ color: WOOD_DEEP }} />
      {[-0.78, -0.66, -0.54, -0.42, 0.42, 0.54, 0.66, 0.78].map((x) => (
        <Picket key={x} x={x} />
      ))}
      <Box args={[0.07, 0.34, 0.07]} position={[-0.22, 0.22, 0.9]} tone={{ color: WOOD_DEEP }} />
      <Box args={[0.07, 0.34, 0.07]} position={[0.22, 0.22, 0.9]} tone={{ color: WOOD_DEEP }} />
      <Box args={[0.18, 0.04, 0.04]} position={[-0.22, 0.36, 0.9]} tone={{ color: GOLD }} />
      <Box args={[0.18, 0.04, 0.04]} position={[0.22, 0.36, 0.9]} tone={{ color: GOLD }} />
    </group>
  );
}

export function HouseLantern() {
  return (
    <group name="house-lantern" position={[0.5, 0.7, 0.49]}>
      <Box args={[0.07, 0.1, 0.07]} tone={{ color: FRAME }} />
      <Sphere radius={0.04} position={[0, 0, 0.04]} tone={{ color: GOLD }} />
    </group>
  );
}

export function HouseGarden() {
  return (
    <group name="house-garden">
      <Sphere scale={[0.18, 0.14, 0.16]} position={[-0.78, 0.1, 0.22]} tone={{ color: LEAF }} />
      <Sphere scale={[0.14, 0.1, 0.12]} position={[-0.64, 0.08, 0.38]} tone={{ color: "#65a30d" }} />
      <Sphere scale={[0.16, 0.12, 0.14]} position={[0.62, 0.1, 0.42]} tone={{ color: "#3f6212" }} />
      <Cylinder args={[0.04, 0.05, 0.16, 8]} position={[0.82, 0.08, -0.08]} tone={{ color: "#92400e" }} />
      <Cone args={[0.18, 0.46, 7]} position={[0.82, 0.42, -0.08]} tone={{ color: "#166534" }} />
      <Cone args={[0.13, 0.3, 7]} position={[0.82, 0.7, -0.08]} tone={{ color: "#15803d" }} />
      <Cylinder args={[0.05, 0.06, 0.18, 8]} position={[0.92, 0.09, -0.32]} tone={{ color: "#92400e" }} />
      <Cone args={[0.22, 0.56, 7]} position={[0.92, 0.5, -0.32]} tone={{ color: "#14532d" }} />
      <Cone args={[0.15, 0.36, 7]} position={[0.92, 0.82, -0.32]} tone={{ color: "#166534" }} />
      <Box args={[0.14, 0.12, 0.14]} position={[0.82, 0.08, 0.72]} tone={{ color: WOOD }} />
      <Cylinder args={[0.07, 0.08, 0.12, 10]} position={[0.68, 0.08, 0.78]} tone={{ color: WOOD_DEEP }} />
    </group>
  );
}

export function HouseWing() {
  return (
    <group name="house-wing" position={[0.98, 0, 0.02]}>
      <Box args={[0.48, 0.1, 0.68]} position={[0, 0.05, 0]} tone={{ color: STONE }} />
      <Box args={[0.42, 0.42, 0.6]} position={[0, 0.3, 0]} tone={{ color: WALL }} />
      <Box
        args={[0.52, 0.08, 0.72]}
        position={[0.04, 0.58, 0]}
        rotation={[0, 0, -0.38]}
        tone={{ color: ROOF }}
      />
      <SquareWindow position={[0, 0.32, 0.32]} width={0.16} height={0.16} />
    </group>
  );
}

export function HouseTurret() {
  return (
    <group name="house-turret" position={[-0.52, 0, -0.18]}>
      <Cylinder args={[0.2, 0.22, 0.58, 12]} position={[0, 0.36, 0]} tone={{ color: WALL }} />
      <Cone args={[0.26, 0.3, 8]} position={[0, 0.8, 0]} tone={{ color: ROOF }} />
      <SquareWindow position={[0, 0.4, 0.21]} width={0.11} height={0.11} />
    </group>
  );
}

export function HouseDormer() {
  return (
    <group name="house-dormer" position={[-0.18, 1.08, 0.22]}>
      <Box args={[0.18, 0.14, 0.16]} position={[0, 0, 0]} tone={{ color: WALL }} />
      <Box
        args={[0.16, 0.05, 0.2]}
        position={[-0.05, 0.1, 0]}
        rotation={[0, 0, 0.48]}
        tone={{ color: ROOF }}
      />
      <Box
        args={[0.16, 0.05, 0.2]}
        position={[0.05, 0.1, 0]}
        rotation={[0, 0, -0.48]}
        tone={{ color: ROOF }}
      />
    </group>
  );
}

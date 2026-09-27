"use client";

import { useEffect, useState } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { archPoints } from "./campus-geometry";
import { Box, Cylinder, Plane, RoundedBox, Silhouette, Sphere } from "./campus-primitives";

const FRAME = "#fff7ed";
const GLASS = "#7dd3fc";
const WOOD = "#b45309";
const LEAF = "#4ade80";
const LEAF_DEEP = "#16a34a";
const STONE = "#a8a29e";
const GOLD = "#fbbf24";
const POLE = "#78716c";

type Vec3 = [number, number, number];

export function ArchWindow({
  position,
  rotation,
  width = 0.13,
  height = 0.2,
  frame = FRAME,
  glass = GLASS,
}: {
  position?: Vec3;
  rotation?: Vec3;
  width?: number;
  height?: number;
  frame?: string;
  glass?: string;
}) {
  const outer = archPoints(0, 0, width, height);
  const inner = archPoints(0, 0.012, width * 0.7, height * 0.78);
  return (
    <group position={position} rotation={rotation}>
      <Silhouette outline={outer} holes={[inner]} depth={0.035} tone={{ color: frame }} />
      <Silhouette outline={inner} depth={0.02} position={[0, 0, 0.006]} tone={{ color: glass, roughness: 0.28 }} />
    </group>
  );
}

export function Column({
  position,
  height = 0.46,
  radius = 0.045,
  tone = "#f3e6d0",
}: {
  position?: Vec3;
  height?: number;
  radius?: number;
  tone?: string;
}) {
  return (
    <group position={position}>
      <Cylinder args={[radius, radius * 1.08, height, 12]} position={[0, height / 2, 0]} tone={{ color: tone }} />
      <Box args={[radius * 2.4, 0.04, radius * 2.4]} position={[0, 0.02, 0]} tone={{ color: tone }} />
      <Box args={[radius * 2.3, 0.04, radius * 2.3]} position={[0, height - 0.02, 0]} tone={{ color: tone }} />
    </group>
  );
}

export function Tree({
  position,
  scale = 1,
}: {
  position?: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <Cylinder args={[0.045, 0.06, 0.22, 8]} position={[0, 0.11, 0]} tone={{ color: WOOD }} />
      <Sphere scale={[0.2, 0.18, 0.2]} position={[0, 0.34, 0]} tone={{ color: LEAF_DEEP }} />
      <Sphere scale={[0.16, 0.14, 0.16]} position={[-0.08, 0.4, 0.04]} tone={{ color: LEAF }} />
      <Sphere scale={[0.14, 0.12, 0.14]} position={[0.08, 0.38, -0.04]} tone={{ color: "#22c55e" }} />
    </group>
  );
}

export function Bush({
  position,
  scale = 1,
}: {
  position?: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <Sphere scale={[0.12, 0.09, 0.11]} position={[0, 0.08, 0]} tone={{ color: LEAF_DEEP }} />
      <Sphere scale={[0.09, 0.07, 0.09]} position={[0.07, 0.07, 0.03]} tone={{ color: LEAF }} />
    </group>
  );
}

export function Bench({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[0.32, 0.03, 0.12]} position={[0, 0.12, 0]} tone={{ color: WOOD }} />
      <Box args={[0.32, 0.03, 0.04]} position={[0, 0.18, -0.05]} tone={{ color: WOOD }} />
      <Cylinder args={[0.02, 0.02, 0.12, 8]} position={[-0.12, 0.06, 0.04]} tone={{ color: STONE }} />
      <Cylinder args={[0.02, 0.02, 0.12, 8]} position={[0.12, 0.06, 0.04]} tone={{ color: STONE }} />
      <Cylinder args={[0.02, 0.02, 0.12, 8]} position={[-0.12, 0.06, -0.04]} tone={{ color: STONE }} />
      <Cylinder args={[0.02, 0.02, 0.12, 8]} position={[0.12, 0.06, -0.04]} tone={{ color: STONE }} />
    </group>
  );
}

export function Lamp({
  position,
}: {
  position?: Vec3;
}) {
  return (
    <group position={position}>
      <Cylinder args={[0.018, 0.022, 0.36, 8]} position={[0, 0.18, 0]} tone={{ color: POLE }} />
      <Box args={[0.08, 0.04, 0.08]} position={[0, 0.38, 0]} tone={{ color: POLE }} />
      <Sphere radius={0.035} position={[0, 0.34, 0]} tone={{ color: GOLD }} />
    </group>
  );
}

export function Flag({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.012, 0.014, 0.42, 8]} position={[0, 0.21, 0]} tone={{ color: POLE }} />
      <Sphere radius={0.018} position={[0, 0.43, 0]} tone={{ color: GOLD }} />
      <Plane args={[0.18, 0.11]} position={[0.1, 0.34, 0]} tone={{ color: GOLD }} />
      <Sphere radius={0.018} position={[0.1, 0.34, 0.01]} tone={{ color: FRAME }} />
    </group>
  );
}

export function FenceRun({
  length,
  position,
  rotation,
}: {
  length: number;
  position?: Vec3;
  rotation?: Vec3;
}) {
  const count = Math.max(2, Math.round(length / 0.3) + 1);
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, index) => {
        const x = -length / 2 + (index / (count - 1)) * length;
        return (
          <Cylinder
            key={index}
            args={[0.018, 0.02, 0.22, 8]}
            position={[x, 0.12, 0]}
            tone={{ color: "#e8d5b5" }}
          />
        );
      })}
      <Box args={[length, 0.025, 0.03]} position={[0, 0.1, 0]} tone={{ color: FRAME }} />
      <Box args={[length, 0.025, 0.03]} position={[0, 0.18, 0]} tone={{ color: FRAME }} />
    </group>
  );
}

export function Seesaw({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.04, 0.05, 0.12, 10]} position={[0, 0.07, 0]} tone={{ color: STONE }} />
      <Box args={[0.62, 0.035, 0.1]} position={[0, 0.16, 0]} rotation={[0, 0, 0.18]} tone={{ color: WOOD }} />
      <Sphere radius={0.045} position={[-0.24, 0.1, 0]} tone={{ color: "#38bdf8" }} />
      <Sphere radius={0.045} position={[0.24, 0.22, 0]} tone={{ color: "#fb7185" }} />
    </group>
  );
}

export function Slide({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[0.18, 0.04, 0.18]} position={[0, 0.28, -0.08]} tone={{ color: "#f97316" }} />
      <Cylinder args={[0.02, 0.02, 0.28, 8]} position={[-0.06, 0.14, -0.08]} tone={{ color: STONE }} />
      <Cylinder args={[0.02, 0.02, 0.28, 8]} position={[0.06, 0.14, -0.08]} tone={{ color: STONE }} />
      <Box
        args={[0.16, 0.03, 0.42]}
        position={[0, 0.16, 0.14]}
        rotation={[-0.55, 0, 0]}
        tone={{ color: "#fb923c" }}
      />
      <Box args={[0.03, 0.06, 0.42]} position={[-0.09, 0.18, 0.14]} rotation={[-0.55, 0, 0]} tone={{ color: "#f97316" }} />
      <Box args={[0.03, 0.06, 0.42]} position={[0.09, 0.18, 0.14]} rotation={[-0.55, 0, 0]} tone={{ color: "#f97316" }} />
    </group>
  );
}

export function Swing({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.02, 0.022, 0.42, 8]} position={[-0.16, 0.22, 0]} tone={{ color: STONE }} />
      <Cylinder args={[0.02, 0.022, 0.42, 8]} position={[0.16, 0.22, 0]} tone={{ color: STONE }} />
      <Box args={[0.38, 0.03, 0.03]} position={[0, 0.42, 0]} tone={{ color: STONE }} />
      <Cylinder args={[0.01, 0.01, 0.22, 6]} position={[-0.08, 0.28, 0]} tone={{ color: POLE }} />
      <Cylinder args={[0.01, 0.01, 0.22, 6]} position={[0.08, 0.28, 0]} tone={{ color: POLE }} />
      <Box args={[0.1, 0.02, 0.08]} position={[-0.08, 0.16, 0]} tone={{ color: WOOD }} />
      <Box args={[0.1, 0.02, 0.08]} position={[0.08, 0.16, 0]} tone={{ color: WOOD }} />
    </group>
  );
}

export function Sandbox({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Box args={[0.48, 0.05, 0.36]} position={[0, 0.03, 0]} tone={{ color: WOOD }} />
      <Box args={[0.4, 0.04, 0.28]} position={[0, 0.05, 0]} tone={{ color: "#fde68a" }} />
      <Sphere radius={0.04} position={[-0.08, 0.1, 0.04]} tone={{ color: "#38bdf8" }} />
      <Sphere radius={0.035} position={[0.1, 0.09, -0.04]} tone={{ color: "#f97316" }} />
    </group>
  );
}

function Wheel({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <Cylinder args={[0.07, 0.07, 0.05, 10]} tone={{ color: "#1c1917" }} />
      <Cylinder args={[0.03, 0.03, 0.06, 8]} tone={{ color: STONE }} />
    </group>
  );
}

/** Toy school bus. Length runs along +X; door faces -Z. */
export function SchoolBus({
  position,
  rotation,
}: {
  position?: Vec3;
  rotation?: Vec3;
}) {
  const yellow = "#f5c518";
  const yellowDeep = "#eab308";
  const windowXs = [-0.28, -0.08, 0.12];
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.22, 0.03, 0.46]} radius={0.03} position={[0, 0.012, 0]} tone={{ color: "#57534e" }} />
      <RoundedBox args={[0.92, 0.28, 0.32]} radius={0.04} position={[-0.08, 0.28, 0]} tone={{ color: yellow }} />
      <RoundedBox args={[0.28, 0.16, 0.3]} radius={0.03} position={[0.48, 0.2, 0]} tone={{ color: yellowDeep }} />
      <Box args={[1.18, 0.05, 0.33]} position={[0, 0.18, 0]} tone={{ color: "#1c1917" }} />
      <Box args={[0.88, 0.03, 0.33]} position={[-0.08, 0.43, 0]} tone={{ color: yellowDeep }} />
      <Box args={[0.05, 0.06, 0.34]} position={[0.64, 0.12, 0]} tone={{ color: STONE }} />
      <Box args={[0.05, 0.06, 0.34]} position={[-0.56, 0.12, 0]} tone={{ color: STONE }} />
      {windowXs.map((x) => (
        <Box key={`win-z-${x}`} args={[0.14, 0.1, 0.02]} position={[x, 0.34, 0.16]} tone={{ color: GLASS, roughness: 0.28 }} />
      ))}
      {windowXs.map((x) => (
        <Box key={`win-nz-${x}`} args={[0.14, 0.1, 0.02]} position={[x, 0.34, -0.16]} tone={{ color: GLASS, roughness: 0.28 }} />
      ))}
      <Box args={[0.1, 0.18, 0.02]} position={[0.32, 0.28, -0.16]} tone={{ color: GLASS, roughness: 0.28 }} />
      <Box args={[0.08, 0.08, 0.02]} position={[0.5, 0.24, 0.16]} tone={{ color: GLASS, roughness: 0.28 }} />
      <Sphere radius={0.025} position={[0.64, 0.2, 0.1]} tone={{ color: FRAME }} />
      <Sphere radius={0.025} position={[0.64, 0.2, -0.1]} tone={{ color: FRAME }} />
      <Sphere radius={0.02} position={[-0.56, 0.2, 0.1]} tone={{ color: "#ef4444" }} />
      <Sphere radius={0.02} position={[-0.56, 0.2, -0.1]} tone={{ color: "#ef4444" }} />
      <Box args={[0.04, 0.1, 0.1]} position={[0.18, 0.32, 0.18]} tone={{ color: "#ef4444" }} />
      <Wheel position={[0.38, 0.07, 0.16]} />
      <Wheel position={[0.38, 0.07, -0.16]} />
      <Wheel position={[-0.34, 0.07, 0.16]} />
      <Wheel position={[-0.34, 0.07, -0.16]} />
    </group>
  );
}

function paintSignTexture(line1: string, line2: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff7ed";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 88px Segoe UI, system-ui, sans-serif";
  ctx.fillText(line1, 512, 175);
  ctx.font = "700 120px Segoe UI, system-ui, sans-serif";
  ctx.fillText(line2, 512, 330);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function YardSign({
  lines,
  position,
  rotation,
  width = 0.64,
  height = 0.3,
}: {
  lines: [string, string];
  position?: Vec3;
  rotation?: Vec3;
  width?: number;
  height?: number;
}) {
  const [map, setMap] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    const texture = paintSignTexture(lines[0], lines[1]);
    setMap(texture);
    return () => {
      texture?.dispose();
      setMap(null);
    };
  }, [lines[0], lines[1]]);
  return (
    <group position={position} rotation={rotation}>
      <Cylinder args={[0.02, 0.022, 0.36, 8]} position={[-width / 2 + 0.05, 0.18, 0]} tone={{ color: FRAME }} />
      <Cylinder args={[0.02, 0.022, 0.36, 8]} position={[width / 2 - 0.05, 0.18, 0]} tone={{ color: FRAME }} />
      <Box args={[width + 0.06, height + 0.06, 0.05]} position={[0, 0.42, 0]} tone={{ color: FRAME }} />
      <Box args={[width, height, 0.03]} position={[0, 0.42, 0.02]} tone={{ color: "#1d4ed8" }} />
      {map ? (
        <mesh position={[0, 0.42, 0.04]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

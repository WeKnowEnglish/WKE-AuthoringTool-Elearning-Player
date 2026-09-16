"use client";

import { circlePoints, gableOutline } from "../campus-geometry";
import { ArchWindow, Bench, Bush, Column, FenceRun, Flag, Lamp, Sandbox, SchoolBus, Seesaw, Slide, Swing, Tree, YardSign } from "../campus-props";
import { Box, Plane, Prism, RoundedBox, Silhouette, Sphere } from "../campus-primitives";

const WALL = "#f3e6d0";
const WALL_DEEP = "#e8d5b5";
const ROOF = "#3b82f6";
const ROOF_DEEP = "#2563eb";
const DOOR = "#2563eb";
const GLASS = "#7dd3fc";
const FRAME = "#fff7ed";
const STONE = "#e7e5e4";
const STONE_DEEP = "#a8a29e";
const GOLD = "#fbbf24";
const PATH = "#d6d3d1";
const LAWN = "#8fce6b";
const SAND = "#f5d89a";

const WING_W = 0.72;
const CENTER_W = 0.86;
const DEPTH = 0.62;
const WING_H = 0.78;
const CENTER_H = 0.9;
const BASE_Y = 0.07;
const GABLE_H = 0.3;
const WING_X = (CENTER_W + WING_W) / 2;
const FRONT_Z = DEPTH / 2;

export function SchoolBody() {
  return (
    <group name="school-body">
      <RoundedBox args={[2.42, 0.08, 0.86]} radius={0.03} position={[0, 0.04, 0.04]} tone={{ color: STONE }} />
      <RoundedBox args={[CENTER_W, CENTER_H, DEPTH]} radius={0.05} position={[0, BASE_Y + CENTER_H / 2, 0]} tone={{ color: WALL }} />
      <RoundedBox
        args={[WING_W, WING_H, DEPTH]}
        radius={0.045}
        position={[-WING_X, BASE_Y + WING_H / 2, 0]}
        tone={{ color: WALL }}
      />
      <RoundedBox
        args={[WING_W, WING_H, DEPTH]}
        radius={0.045}
        position={[WING_X, BASE_Y + WING_H / 2, 0]}
        tone={{ color: WALL }}
      />
    </group>
  );
}

export function SchoolRoof() {
  const wingRoofY = BASE_Y + WING_H;
  const centerRoofY = BASE_Y + CENTER_H;
  return (
    <group name="school-roof">
      <Box args={[WING_W + 0.08, 0.06, DEPTH + 0.08]} position={[-WING_X, wingRoofY + 0.03, 0]} tone={{ color: ROOF }} />
      <Box args={[WING_W + 0.08, 0.06, DEPTH + 0.08]} position={[WING_X, wingRoofY + 0.03, 0]} tone={{ color: ROOF }} />
      <Prism
        width={WING_W + 0.1}
        height={0.16}
        depth={DEPTH + 0.1}
        position={[-WING_X, wingRoofY + 0.06, -(DEPTH + 0.1) / 2]}
        tone={{ color: ROOF_DEEP }}
      />
      <Prism
        width={WING_W + 0.1}
        height={0.16}
        depth={DEPTH + 0.1}
        position={[WING_X, wingRoofY + 0.06, -(DEPTH + 0.1) / 2]}
        tone={{ color: ROOF_DEEP }}
      />
      <Box args={[CENTER_W + 0.1, 0.07, DEPTH + 0.1]} position={[0, centerRoofY + 0.03, 0]} tone={{ color: ROOF }} />
      <Prism
        width={CENTER_W + 0.12}
        height={GABLE_H}
        depth={DEPTH + 0.12}
        position={[0, centerRoofY + 0.06, -(DEPTH + 0.12) / 2]}
        tone={{ color: ROOF }}
      />
      <Silhouette
        outline={gableOutline(CENTER_W + 0.04, 0, 0.02, GABLE_H - 0.02)}
        depth={0.06}
        position={[0, centerRoofY, FRONT_Z - 0.02]}
        tone={{ color: WALL }}
      />
    </group>
  );
}

function wingWindows(x: number) {
  const xs = [-0.22, 0, 0.22];
  const ys = [BASE_Y + 0.26, BASE_Y + 0.54];
  return ys.flatMap((y, row) =>
    xs.map((offset, col) => (
      <ArchWindow key={`${x}-${row}-${col}`} position={[x + offset, y, FRONT_Z + 0.01]} />
    )),
  );
}

export function SchoolWindows() {
  return (
    <group name="school-windows">
      {wingWindows(-WING_X)}
      {wingWindows(WING_X)}
      <ArchWindow position={[-0.22, BASE_Y + 0.62, FRONT_Z + 0.01]} width={0.14} height={0.2} />
      <ArchWindow position={[0.22, BASE_Y + 0.62, FRONT_Z + 0.01]} width={0.14} height={0.2} />
    </group>
  );
}

export function SchoolEntrance() {
  return (
    <group name="school-entrance">
      <Box args={[0.5, 0.5, 0.1]} position={[0, BASE_Y + 0.28, FRONT_Z + 0.04]} tone={{ color: WALL_DEEP }} />
      <Box args={[0.16, 0.36, 0.04]} position={[-0.09, BASE_Y + 0.22, FRONT_Z + 0.1]} tone={{ color: DOOR }} />
      <Box args={[0.16, 0.36, 0.04]} position={[0.09, BASE_Y + 0.22, FRONT_Z + 0.1]} tone={{ color: DOOR }} />
      <Sphere radius={0.018} position={[-0.04, BASE_Y + 0.22, FRONT_Z + 0.13]} tone={{ color: GOLD }} />
      <Sphere radius={0.018} position={[0.04, BASE_Y + 0.22, FRONT_Z + 0.13]} tone={{ color: GOLD }} />
      <Column position={[-0.3, 0, FRONT_Z + 0.16]} height={0.52} tone={WALL} />
      <Column position={[0.3, 0, FRONT_Z + 0.16]} height={0.52} tone={WALL} />
      <Box args={[0.72, 0.06, 0.28]} position={[0, BASE_Y + 0.55, FRONT_Z + 0.14]} tone={{ color: WALL }} />
      <RoundedBox args={[0.5, 0.05, 0.18]} radius={0.02} position={[0, 0.05, FRONT_Z + 0.24]} tone={{ color: STONE }} />
      <RoundedBox args={[0.42, 0.05, 0.16]} radius={0.02} position={[0, 0.09, FRONT_Z + 0.34]} tone={{ color: PATH }} />
      <RoundedBox args={[0.34, 0.05, 0.14]} radius={0.02} position={[0, 0.13, FRONT_Z + 0.44]} tone={{ color: STONE }} />
    </group>
  );
}

export function SchoolClock() {
  const cy = BASE_Y + CENTER_H + 0.16;
  return (
    <group name="school-clock" position={[0, cy, FRONT_Z + 0.04]}>
      <Silhouette outline={circlePoints(0, 0, 0.1, 22)} depth={0.04} tone={{ color: FRAME }} />
      <Silhouette outline={circlePoints(0, 0, 0.078, 22)} depth={0.03} position={[0, 0, 0.01]} tone={{ color: "#e0f2fe" }} />
      <Box args={[0.012, 0.05, 0.02]} position={[0, 0.016, 0.04]} tone={{ color: STONE_DEEP }} />
      <Box args={[0.036, 0.012, 0.02]} position={[0.014, 0, 0.04]} tone={{ color: ROOF_DEEP }} />
      <Sphere radius={0.012} position={[0, 0, 0.05]} tone={{ color: GOLD }} />
    </group>
  );
}

export function SchoolSign() {
  return (
    <group name="school-sign" position={[0, BASE_Y + 0.46, FRONT_Z + 0.05]}>
      <Box args={[0.52, 0.12, 0.05]} tone={{ color: FRAME }} />
      <Plane args={[0.46, 0.08]} position={[0, 0, 0.03]} tone={{ color: "#dbeafe" }} />
    </group>
  );
}

export function SchoolYard() {
  return (
    <group name="school-yard">
      <RoundedBox args={[3.35, 0.04, 2.35]} radius={0.08} position={[0.12, 0.015, 0.38]} tone={{ color: LAWN }} />
      <Box args={[0.36, 0.03, 1.05]} position={[0, 0.04, FRONT_Z + 0.78]} tone={{ color: PATH }} />
      <Box args={[0.12, 0.025, 0.12]} position={[-0.1, 0.05, FRONT_Z + 0.95]} tone={{ color: STONE }} />
      <Box args={[0.12, 0.025, 0.12]} position={[0.1, 0.05, FRONT_Z + 1.08]} tone={{ color: STONE }} />
      <Box args={[0.12, 0.025, 0.12]} position={[-0.1, 0.05, FRONT_Z + 1.22]} tone={{ color: STONE }} />
      <RoundedBox args={[0.1, 0.02, 0.1]} radius={0.02} position={[-0.42, 0.04, 1.12]} tone={{ color: "#fca5a5" }} />
      <RoundedBox args={[0.1, 0.02, 0.1]} radius={0.02} position={[-0.42, 0.04, 1.24]} tone={{ color: "#93c5fd" }} />
      <RoundedBox args={[0.1, 0.02, 0.1]} radius={0.02} position={[-0.42, 0.04, 1.36]} tone={{ color: "#fde047" }} />
      <Flag position={[0.12, BASE_Y + CENTER_H + GABLE_H - 0.02, 0]} />
      <Tree position={[-1.38, 0, 0.18]} scale={1.05} />
      <Tree position={[-1.28, 0, 1.12]} scale={0.82} />
      <Tree position={[1.52, 0, -0.18]} scale={0.88} />
      <Bush position={[-0.72, 0, 0.48]} />
      <Bush position={[-0.52, 0, 0.42]} scale={0.8} />
      <Bush position={[0.55, 0, 0.44]} />
      <Bush position={[-1.12, 0, 0.72]} scale={0.7} />
      <Bush position={[-1.48, 0, 0.82]} scale={0.85} />
      <Bush position={[1.58, 0, 0.22]} scale={0.75} />
      <Bench position={[-0.62, 0, 0.92]} />
      <Lamp position={[-0.28, 0, 0.82]} />
      <Lamp position={[0.28, 0, 0.82]} />
      <FenceRun length={1.18} position={[-0.96, 0, 1.48]} />
      <FenceRun length={1.4} position={[1.08, 0, 1.48]} />
      <FenceRun length={2.06} position={[-1.55, 0, 0.45]} rotation={[0, Math.PI / 2, 0]} />
      <FenceRun length={2.06} position={[1.78, 0, 0.45]} rotation={[0, Math.PI / 2, 0]} />
      <FenceRun length={3.33} position={[0.115, 0, -0.58]} />
      <Box args={[0.05, 0.28, 0.05]} position={[-0.37, 0.14, 1.48]} tone={{ color: "#e8d5b5" }} />
      <Box args={[0.05, 0.28, 0.05]} position={[0.37, 0.14, 1.48]} tone={{ color: "#e8d5b5" }} />
      <YardSign lines={["Green Valley", "School"]} position={[0, 0, 1.82]} />
      <SchoolBus position={[-1.12, 0, 1.94]} rotation={[0, 0.06, 0]} />
    </group>
  );
}

export function SchoolPlayground() {
  return (
    <group name="school-playground" position={[1.12, 0, 1.02]}>
      <RoundedBox args={[0.98, 0.035, 0.88]} radius={0.05} position={[0, 0.03, 0]} tone={{ color: SAND }} />
      <Sandbox position={[-0.24, 0, -0.22]} />
      <Slide position={[0.26, 0, -0.18]} rotation={[0, -0.35, 0]} />
      <Seesaw position={[-0.22, 0, 0.24]} />
      <Swing position={[0.26, 0, 0.26]} />
      <Sphere radius={0.06} position={[0.02, 0.08, 0.04]} tone={{ color: "#f97316" }} />
      <Sphere radius={0.04} position={[-0.4, 0.07, 0.08]} tone={{ color: "#38bdf8" }} />
    </group>
  );
}

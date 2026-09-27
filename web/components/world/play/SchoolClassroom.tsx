"use client";

import { Box } from "../campus/campus-primitives";
import { PlayGltf } from "./PlayGltf";
import { PatternedBox } from "./room-surfaces";

const WALL = "#e8d5b5";
const TRIM = "#fff7ed";

export const CLASSROOM_SRC = {
  blackboard: "/world/props/classroom/blackboardbig.glb",
  desk: "/world/props/classroom/desk.glb",
  chairTable: "/world/props/classroom/chairtable.glb",
  chair: "/world/props/classroom/chair.glb",
  shelf: "/world/props/classroom/shelf.glb",
  locker: "/world/props/classroom/locker.glb",
} as const;

export function SchoolClassroom() {
  const desks: Array<[number, number]> = [
    [-3.4, 0.35],
    [3.4, 0.35],
    [-3.4, 2.55],
    [3.4, 2.55],
  ];
  return (
    <group name="school-classroom">
      <PatternedBox args={[16.4, 0.12, 12.4]} position={[0, -0.06, 0]} kind="checkers" roughness={0.78} />
      <Box args={[16.6, 3.2, 0.28]} position={[0, 1.55, -6.15]} tone={{ color: WALL, roughness: 0.88 }} />
      <Box args={[0.28, 3.2, 12.6]} position={[-8.15, 1.55, 0]} tone={{ color: WALL, roughness: 0.88 }} />
      <Box args={[0.28, 3.2, 12.6]} position={[8.15, 1.55, 0]} tone={{ color: WALL, roughness: 0.88 }} />
      <Box args={[6.8, 3.2, 0.28]} position={[-4.9, 1.55, 6.15]} tone={{ color: WALL, roughness: 0.88 }} />
      <Box args={[6.8, 3.2, 0.28]} position={[4.9, 1.55, 6.15]} tone={{ color: WALL, roughness: 0.88 }} />
      <Box args={[3.0, 0.28, 0.28]} position={[0, 3.02, 6.15]} tone={{ color: TRIM }} />
      <PlayGltf
        src={CLASSROOM_SRC.blackboard}
        position={[0, 1.55, -5.72]}
        fitHeight={1.45}
        ground={false}
      />
      <PlayGltf src={CLASSROOM_SRC.desk} position={[0, 0, -3.4]} fitHeight={0.86} />
      <PlayGltf src={CLASSROOM_SRC.chair} position={[0, 0, -2.55]} rotation={[0, Math.PI, 0]} fitHeight={0.9} />
      {desks.map(([x, z]) => (
        <PlayGltf
          key={`${x}-${z}`}
          src={CLASSROOM_SRC.chairTable}
          position={[x, 0, z]}
          rotation={[0, Math.PI, 0]}
          fitHeight={0.78}
        />
      ))}
      <PlayGltf src={CLASSROOM_SRC.locker} position={[-6.8, 0, -2.2]} rotation={[0, Math.PI / 2, 0]} fitHeight={1.8} />
      <PlayGltf src={CLASSROOM_SRC.shelf} position={[6.8, 0, -1.6]} rotation={[0, -Math.PI / 2, 0]} fitHeight={1.7} />
    </group>
  );
}

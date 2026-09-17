"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import { clampToAabb, moveWithWalls, type Aabb } from "@/lib/world/play-move";
import { PLAYER_RADIUS, PLAYER_SPEED } from "@/lib/world/play-layout";
import { PlayAvatar } from "./PlayAvatar";

type Keys = {
  x: number;
  z: number;
};

type Props = {
  spawn: { x: number; z: number };
  spawnYaw?: number;
  walls: Aabb[];
  clampRadius?: number;
  clampBounds?: Aabb;
  stick?: Keys;
  cameraOffset?: [number, number, number];
  onMove?: (x: number, z: number) => void;
};

const CAMERA_OFFSET = new Vector3(0, 3.4, 6.2);
const LOOK_AT = new Vector3();
const CAM_POS = new Vector3();
const OFFSET = new Vector3();

function axisFromHeld(held: Set<string>, negative: string[], positive: string[]): number {
  const down = negative.some((key) => held.has(key));
  const up = positive.some((key) => held.has(key));
  return (up ? 1 : 0) - (down ? 1 : 0);
}

export function PlayPlayer({
  spawn,
  spawnYaw = Math.PI,
  walls,
  clampRadius,
  clampBounds,
  stick = { x: 0, z: 0 },
  cameraOffset,
  onMove,
}: Props) {
  const groupRef = useRef<Group>(null);
  const pos = useRef({ x: spawn.x, z: spawn.z, yaw: Math.PI });
  const keys = useRef({ x: 0, z: 0 });
  const held = useRef(new Set<string>());
  const camera = useThree((state) => state.camera);
  const wallsRef = useRef(walls);
  const stickRef = useRef(stick);
  const onMoveRef = useRef(onMove);
  const offsetRef = useRef(cameraOffset);
  const clampBoundsRef = useRef(clampBounds);
  const walkingRef = useRef(false);
  wallsRef.current = walls;
  stickRef.current = stick;
  onMoveRef.current = onMove;
  offsetRef.current = cameraOffset;
  clampBoundsRef.current = clampBounds;

  useEffect(() => {
    pos.current = { x: spawn.x, z: spawn.z, yaw: spawnYaw };
  }, [spawn.x, spawn.z, spawnYaw]);

  useEffect(() => {
    const applyHeld = () => {
      const keysHeld = held.current;
      keys.current = {
        x: axisFromHeld(keysHeld, ["ArrowLeft", "a", "A"], ["ArrowRight", "d", "D"]),
        z: axisFromHeld(keysHeld, ["ArrowUp", "w", "W"], ["ArrowDown", "s", "S"]),
      };
    };
    const clearHeld = () => {
      held.current.clear();
      keys.current = { x: 0, z: 0 };
    };
    const onDown = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) event.preventDefault();
      if (event.repeat) return;
      held.current.add(event.key);
      applyHeld();
    };
    const onUp = (event: KeyboardEvent) => {
      held.current.delete(event.key);
      applyHeld();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearHeld);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearHeld);
    };
  }, []);

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;
    const inputX = keys.current.x + (stickRef.current?.x ?? 0);
    const inputZ = keys.current.z + (stickRef.current?.z ?? 0);
    const len = Math.hypot(inputX, inputZ);
    walkingRef.current = len > 0.08;
    if (len > 0.08) {
      const nx = inputX / len;
      const nz = inputZ / len;
      const step = PLAYER_SPEED * Math.min(dt, 0.05);
      const next = moveWithWalls(
        pos.current.x,
        pos.current.z,
        nx * step,
        nz * step,
        PLAYER_RADIUS,
        wallsRef.current,
        clampRadius,
      );
      pos.current.x = next.x;
      pos.current.z = next.z;
      pos.current.yaw = Math.atan2(nx, nz);
    }
    const bounds = clampBoundsRef.current;
    if (bounds) {
      const clamped = clampToAabb(pos.current.x, pos.current.z, bounds, PLAYER_RADIUS);
      pos.current.x = clamped.x;
      pos.current.z = clamped.z;
    }
    group.position.set(pos.current.x, 0, pos.current.z);
    group.rotation.y = pos.current.yaw;
    onMoveRef.current?.(pos.current.x, pos.current.z);

    const offset = offsetRef.current;
    OFFSET.set(offset?.[0] ?? CAMERA_OFFSET.x, offset?.[1] ?? CAMERA_OFFSET.y, offset?.[2] ?? CAMERA_OFFSET.z);
    LOOK_AT.set(pos.current.x, 1.1, pos.current.z);
    CAM_POS.set(pos.current.x + OFFSET.x, OFFSET.y, pos.current.z + OFFSET.z);
    if (bounds) {
      const pad = 0.55;
      CAM_POS.x = Math.min(bounds.maxX - pad, Math.max(bounds.minX + pad, CAM_POS.x));
      CAM_POS.z = Math.min(bounds.maxZ - pad, Math.max(bounds.minZ + pad, CAM_POS.z));
    }
    camera.position.lerp(CAM_POS, 0.18);
    camera.lookAt(LOOK_AT);
  });

  return (
    <group ref={groupRef} position={[spawn.x, 0, spawn.z]}>
      <PlayAvatar walkingRef={walkingRef} />
    </group>
  );
}

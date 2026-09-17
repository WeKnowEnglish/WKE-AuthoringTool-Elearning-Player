"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import { Matrix4, Vector3, type Group } from "three";
import { PlayKid } from "./PlayKid";
import {
  GLOBE_KID_SCALE,
  GLOBE_WALK_SPEED,
  globeSurfaceRadius,
  nearestHomeSpot,
  spawnOnGlobe,
  stepOnGlobe,
  type GlobePose,
} from "@/lib/world/globe-walk";
import type { HomeSpotId } from "../world-landmasses";
import { latLonToNormal } from "../sphere-wrap";

type Stick = { x: number; z: number };

type Props = {
  spawnSpot?: HomeSpotId | null;
  spawnKey?: number;
  stick?: Stick;
  poseRef: MutableRefObject<GlobePose>;
  onNearSpot?: (spot: HomeSpotId | null) => void;
};

const LOCAL_X = new Vector3();
const LOCAL_Y = new Vector3();
const LOCAL_Z = new Vector3();
const NORTH = new Vector3();
const EAST = new Vector3();
const MATRIX = new Matrix4();

function axisFromHeld(held: Set<string>, negative: string[], positive: string[]): number {
  const down = negative.some((key) => held.has(key));
  const up = positive.some((key) => held.has(key));
  return (up ? 1 : 0) - (down ? 1 : 0);
}

export function GlobePlayer({ spawnSpot = null, spawnKey = 0, stick = { x: 0, z: 0 }, poseRef, onNearSpot }: Props) {
  const groupRef = useRef<Group>(null);
  const keys = useRef({ x: 0, z: 0 });
  const held = useRef(new Set<string>());
  const stickRef = useRef(stick);
  const onNearSpotRef = useRef(onNearSpot);
  const nearRef = useRef<HomeSpotId | null>(null);
  const walkingRef = useRef(false);
  stickRef.current = stick;
  onNearSpotRef.current = onNearSpot;

  useEffect(() => {
    poseRef.current = spawnOnGlobe(spawnSpot);
    nearRef.current = null;
  }, [poseRef, spawnKey, spawnSpot]);

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
    const east = inputX;
    const north = -inputZ;
    const len = Math.hypot(east, north);
    walkingRef.current = len > 0.08;
    const pose = poseRef.current;
    if (len > 0.08) {
      const step = GLOBE_WALK_SPEED * Math.min(dt, 0.05);
      const next = stepOnGlobe(pose.lat, pose.lon, east, north, step);
      pose.lat = next.lat;
      pose.lon = next.lon;
      pose.facing = Math.atan2(east / len, north / len);
    }

    const radius = globeSurfaceRadius(pose.lat, pose.lon);
    const normal = latLonToNormal(pose.lat, pose.lon);
    const latR = (pose.lat * Math.PI) / 180;
    const lonR = (pose.lon * Math.PI) / 180;
    NORTH.set(-Math.sin(latR) * Math.sin(lonR), Math.cos(latR), -Math.sin(latR) * Math.cos(lonR));
    EAST.set(Math.cos(lonR), 0, -Math.sin(lonR));
    LOCAL_Z.copy(NORTH).multiplyScalar(Math.cos(pose.facing)).addScaledVector(EAST, Math.sin(pose.facing)).normalize();
    LOCAL_Y.copy(normal);
    LOCAL_X.copy(LOCAL_Y).cross(LOCAL_Z).normalize();
    LOCAL_Z.copy(LOCAL_X).cross(LOCAL_Y).normalize();
    MATRIX.makeBasis(LOCAL_X, LOCAL_Y, LOCAL_Z);
    group.position.copy(normal).multiplyScalar(radius);
    group.quaternion.setFromRotationMatrix(MATRIX);
    group.scale.setScalar(GLOBE_KID_SCALE);

    const near = nearestHomeSpot(pose.lat, pose.lon);
    if (near !== nearRef.current) {
      nearRef.current = near;
      onNearSpotRef.current?.(near);
    }
  });

  return (
    <group ref={groupRef}>
      <PlayKid walkingRef={walkingRef} />
    </group>
  );
}

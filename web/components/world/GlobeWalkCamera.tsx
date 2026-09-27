"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type MutableRefObject, type RefObject } from "react";
import { Vector3, type Group } from "three";
import { lookAtLatLon, shortestAngleDelta } from "./look-at-hub";
import { MAX_PITCH, clamp } from "./globe-config";
import { globeSurfaceRadius, type GlobePose } from "@/lib/world/globe-walk";
import { latLonToNormal } from "./sphere-wrap";

type Props = {
  globeRef: RefObject<Group | null>;
  poseRef: MutableRefObject<GlobePose>;
};

const PLAYER = new Vector3();
const LOOK = new Vector3();
const CAM = new Vector3();
const UP = new Vector3();

/** High look-down from a little south of the kid so they stay the focus. */
const SOUTH = 0.92;
const HEIGHT = 0.7;
const LOOK_LIFT = 0.1;

export function GlobeWalkCamera({ globeRef, poseRef }: Props) {
  const camera = useThree((state) => state.camera);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const bootedRef = useRef(false);

  useFrame((_, dt) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pose = poseRef.current;
    const target = lookAtLatLon(pose.lat, pose.lon);
    if (!bootedRef.current) {
      yawRef.current = target.yaw;
      pitchRef.current = target.pitch;
      bootedRef.current = true;
    }
    const ease = 1 - Math.exp(-7.5 * Math.min(dt, 0.05));
    yawRef.current += shortestAngleDelta(yawRef.current, target.yaw) * ease;
    pitchRef.current = clamp(pitchRef.current + (target.pitch - pitchRef.current) * ease, -MAX_PITCH, MAX_PITCH);
    globe.rotation.order = "YXZ";
    globe.rotation.y = yawRef.current;
    globe.rotation.x = pitchRef.current;
    globe.updateMatrixWorld();

    const radius = globeSurfaceRadius(pose.lat, pose.lon);
    PLAYER.copy(latLonToNormal(pose.lat, pose.lon)).multiplyScalar(radius);
    globe.localToWorld(PLAYER);
    UP.set(0, 1, 0);
    LOOK.copy(PLAYER).addScaledVector(UP, LOOK_LIFT);
    CAM.copy(PLAYER).addScaledVector(UP, HEIGHT);
    CAM.z += SOUTH;
    camera.position.lerp(CAM, 0.14);
    camera.lookAt(LOOK);
  });

  return null;
}

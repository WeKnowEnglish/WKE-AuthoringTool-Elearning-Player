"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, type RefObject } from "react";
import type { Camera } from "three";
import { CAMERA_LOOK_AT, cameraPositionFromDistance } from "./globe-config";

type Props = {
  distanceRef: RefObject<number>;
};

function applyView(camera: Camera, distance: number) {
  const [x, y, z] = cameraPositionFromDistance(distance);
  camera.position.set(x, y, z);
  camera.lookAt(...CAMERA_LOOK_AT);
}

/**
 * Camera stays on a fixed desk-globe angle. Students spin the globe;
 * they never fly the camera. The only camera change is distance (zoom).
 */
export function WorldCamera({ distanceRef }: Props) {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    applyView(camera, distanceRef.current);
  }, [camera, distanceRef]);

  useFrame(() => {
    applyView(camera, distanceRef.current);
  });

  return null;
}

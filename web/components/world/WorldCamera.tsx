"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, type RefObject } from "react";

type Props = {
  distanceRef: RefObject<number>;
};

/**
 * Camera stays on the +Z axis looking at the origin. Students spin the globe;
 * they never fly the camera. The only camera change is distance (zoom).
 */
export function WorldCamera({ distanceRef }: Props) {
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    camera.position.set(0, 0, distanceRef.current);
    camera.lookAt(0, 0, 0);
  }, [camera, distanceRef]);

  useFrame(() => {
    camera.position.set(0, 0, distanceRef.current);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

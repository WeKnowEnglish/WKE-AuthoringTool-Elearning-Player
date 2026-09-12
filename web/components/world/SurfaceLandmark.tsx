"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Vector3, type Group } from "three";

type Props = {
  lat: number;
  lon: number;
  radius: number;
  scale?: number;
  /** Extra spin around the surface normal, in radians. */
  yaw?: number;
  name?: string;
  children: ReactNode;
};

const LOCAL_UP = new Vector3(0, 1, 0);

function latLonNormal(latDeg: number, lonDeg: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
}

/** Sit a Y-up landmark on the globe so its local up matches the surface normal. */
export function SurfaceLandmark({ lat, lon, radius, scale = 1, yaw = 0, name, children }: Props) {
  const groupRef = useRef<Group>(null);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const normal = latLonNormal(lat, lon);
    group.position.copy(normal).multiplyScalar(radius);
    group.quaternion.setFromUnitVectors(LOCAL_UP, normal);
    if (yaw) group.rotateY(yaw);
    group.scale.setScalar(scale);
  }, [lat, lon, radius, scale, yaw]);

  return (
    <group ref={groupRef} name={name}>
      {children}
    </group>
  );
}

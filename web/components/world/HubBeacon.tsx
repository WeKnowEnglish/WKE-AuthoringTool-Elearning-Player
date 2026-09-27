"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { GLOBE_RADIUS } from "./globe-config";
import { SurfaceLandmark } from "./SurfaceLandmark";

function skipRaycast() {}

/** Soft ring on the focused local so students can see “you are here.” */
export function HubBeacon({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const ringRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.4) * 0.2;
    const ring = ringRef.current;
    const inner = innerRef.current;
    if (ring?.material && "opacity" in ring.material) {
      ring.material.opacity = pulse;
    }
    if (inner?.material && "opacity" in inner.material) {
      inner.material.opacity = 0.22 + Math.sin(clock.elapsedTime * 2.4) * 0.06;
    }
  });

  return (
    <SurfaceLandmark lat={lat} lon={lon} radius={GLOBE_RADIUS + 0.034} name={name}>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} raycast={skipRaycast}>
        <circleGeometry args={[0.14, 28]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} raycast={skipRaycast}>
        <ringGeometry args={[0.15, 0.18, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </SurfaceLandmark>
  );
}

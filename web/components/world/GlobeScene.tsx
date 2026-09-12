"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { GlobeControls } from "./GlobeControls";
import { GlobeLandmarks } from "./GlobeLandmarks";
import { GlobePlaceholder } from "./GlobePlaceholder";
import {
  CAMERA_FOV,
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  SCENE_BACKGROUND,
  defaultCameraDistance,
} from "./globe-config";
import { WorldCamera } from "./WorldCamera";

export function GlobeScene() {
  const globeRef = useRef<Group>(null);
  const distanceRef = useRef(DEFAULT_CAMERA_DISTANCE);

  useEffect(() => {
    distanceRef.current = defaultCameraDistance(window.innerWidth);
  }, []);

  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{
        position: [0, 0, distanceRef.current],
        fov: CAMERA_FOV,
        near: 0.1,
        far: MAX_CAMERA_DISTANCE + 20,
      }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#93c5fd", "#1e3a5f", 0.32]} />
      <directionalLight position={[4.2, 3.2, 5]} intensity={1.15} />
      <WorldCamera distanceRef={distanceRef} />
      <GlobeControls globeRef={globeRef} distanceRef={distanceRef} />
      <group ref={globeRef} name="globeRoot">
        <GlobePlaceholder />
        <GlobeLandmarks />
      </group>
    </Canvas>
  );
}

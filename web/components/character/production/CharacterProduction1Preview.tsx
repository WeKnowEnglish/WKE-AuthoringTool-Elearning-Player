"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Ref } from "react";
import type { Group } from "three";
import { CharacterTurntable } from "@/components/character/CharacterTurntable";
import { CharacterProduction1 } from "./CharacterProduction1";

type Props = {
  groupRef?: Ref<Group>;
};

function HeroCamera() {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    camera.position.set(3.05, 2.42, 7.15);
    camera.lookAt(0, 2.28, 0);
  });
  return null;
}

export function CharacterProduction1Preview({ groupRef }: Props) {
  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [3.05, 2.42, 7.15], fov: 38, near: 0.1, far: 40 }}
      gl={{ antialias: true }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 2.28, 0);
      }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <color attach="background" args={["#e8eefc"]} />
      <hemisphereLight args={["#f4f7ff", "#9aa8c4", 0.78]} />
      <directionalLight position={[4.2, 7.2, 5.2]} intensity={1.32} />
      <directionalLight position={[-3.2, 2.8, 2.6]} intensity={0.42} />
      <directionalLight position={[-1.4, 3.6, -4.2]} intensity={0.48} />
      <HeroCamera />
      <CharacterTurntable idleSpin initialYaw={0.42}>
        <group ref={groupRef}>
          <CharacterProduction1 />
        </group>
      </CharacterTurntable>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.28} scale={8} blur={2.2} far={5.5} />
    </Canvas>
  );
}

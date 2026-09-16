"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { CharacterModel } from "@/components/character/CharacterModel";
import { CharacterTurntable } from "@/components/character/CharacterTurntable";
import type { CharacterConfig } from "@/lib/character/character-types";

type Props = {
  config: CharacterConfig;
};

function FramedCamera() {
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    camera.position.set(0, 2.4, 10.4);
    camera.lookAt(0, 2.25, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

export function CharacterPreview({ config }: Props) {
  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.4, 10.4], fov: 34, near: 0.1, far: 40 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <color attach="background" args={["#e8eefc"]} />
      <ambientLight intensity={0.78} />
      <directionalLight position={[3.2, 6.4, 4.2]} intensity={1.25} />
      <directionalLight position={[-2.4, 2.2, 3.2]} intensity={0.35} />
      <FramedCamera />
      <CharacterTurntable>
        <CharacterModel config={config} />
      </CharacterTurntable>
    </Canvas>
  );
}

export function CharacterFallback2D({ config }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex flex-col items-center" aria-hidden>
        <div
          className="h-8 w-16 rounded-t-full"
          style={{ background: config.hairColor }}
        />
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-lg"
          style={{ background: config.skinColor }}
        >
          {config.face === "face_03" ? "o" : config.face === "face_02" ? "^" : "u"}
        </div>
        <div className="h-20 w-20 rounded-md" style={{ background: config.topColor }} />
        <div
          className="h-12 w-16 rounded-b-md"
          style={{ background: config.bottomColor ?? config.topColor }}
        />
        <div className="flex gap-3">
          <div
            className="h-4 w-7 rounded"
            style={{ background: config.shoeColor ?? config.topColor }}
          />
          <div
            className="h-4 w-7 rounded"
            style={{ background: config.shoeColor ?? config.topColor }}
          />
        </div>
      </div>
      <p className="max-w-xs text-sm font-semibold text-[var(--pl-muted)]">
        3D preview needs WebGL. You can still pick parts and save your character.
      </p>
    </div>
  );
}

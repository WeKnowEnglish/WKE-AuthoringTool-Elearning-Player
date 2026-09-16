"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, type Ref } from "react";
import type { Group } from "three";
import { CharacterTurntable } from "@/components/character/CharacterTurntable";
import { CharacterKitHead } from "@/components/character/kit/CharacterKitHead";
import { findHero } from "@/lib/character/kit/hero-assets";
import { HEAD_PLATE_YAW } from "@/lib/character/kit/head-plates";
import type { CharacterKitDocument, HeadPlateView } from "@/lib/character/kit/kit-types";
import type { RegionHighlightFlags } from "@/lib/character/kit/highlight-regions";
import { HeadModelGhost } from "./HeadModelGhost";
import { HeadReferencePlate } from "./HeadReferencePlate";

type Props = {
  kit: CharacterKitDocument;
  groupRef?: Ref<Group>;
  showHair?: boolean;
  showPolygons?: boolean;
  highlights?: RegionHighlightFlags;
  plateView?: HeadPlateView;
  showGhost?: boolean;
  ghostWireframe?: boolean;
  ghostOpacity?: number;
  plateSrc?: string;
  plateOpacity?: number;
};

function PreviewCamera({ mode }: { mode: "head" | "body" }) {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    if (mode === "body") {
      camera.position.set(2.4, 2.2, 10);
      camera.lookAt(0, 1.6, 0);
      return;
    }
    camera.position.set(0, 0.08, 3.6);
    camera.lookAt(0, 0.02, 0);
  });
  return null;
}

export function CharacterKitPreview({
  kit,
  groupRef,
  showHair = true,
  showPolygons = false,
  highlights,
  plateView = "threeQuarter",
  showGhost = true,
  ghostWireframe = false,
  ghostOpacity = 0.32,
  plateSrc,
  plateOpacity = 0.55,
}: Props) {
  const hero = findHero(kit.hero);
  const preview = hero.preview === "body" || hero.id === "seed_boy" ? "body" : "head";
  const matchPlates = preview === "head";
  const plate = (kit.plateSrc ?? plateSrc ?? "").trim();
  const showPlate = matchPlates && /^(https?:\/\/|\/|data:)/.test(plate);
  return (
    <Canvas
      key={kit.hero}
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: preview === "body" ? [2.4, 2.2, 10] : [0, 0.08, 3.6], fov: 40, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <color attach="background" args={["#e8eefc"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[2.6, 3.4, 3.8]} intensity={1.2} />
      <directionalLight position={[-2.2, 1.4, 2.6]} intensity={0.4} />
      <PreviewCamera mode={preview} />
      {showPlate ? (
        <Suspense fallback={null}>
          <HeadReferencePlate src={plate} opacity={plateOpacity} />
        </Suspense>
      ) : null}
      <CharacterTurntable
        idleSpin={false}
        yaw={matchPlates ? HEAD_PLATE_YAW[plateView] : preview === "body" ? 0.45 : 0.7}
        locked={matchPlates}
      >
        <group ref={groupRef}>
          <CharacterKitHead kit={kit} showHair={showHair} showPolygons={showPolygons} highlights={highlights} />
        </group>
        {matchPlates && showGhost ? (
          <Suspense fallback={null}>
            <HeadModelGhost opacity={ghostOpacity} wireframe={ghostWireframe} />
          </Suspense>
        ) : null}
      </CharacterTurntable>
    </Canvas>
  );
}

export function CharacterKitFallback2D({ kit }: { kit: CharacterKitDocument }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex flex-col items-center" aria-hidden>
        <div className="h-8 w-20 rounded-t-full" style={{ background: kit.hairColor }} />
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl"
          style={{ background: kit.skinColor }}
        >
          {kit.mouth.expression === "wow" ? "o" : kit.mouth.expression === "cheer" ? "^" : "u"}
        </div>
      </div>
      <p className="max-w-xs text-sm font-semibold text-[var(--pl-muted)]">
        3D preview needs WebGL. You can still edit the kit JSON and save.
      </p>
    </div>
  );
}

"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useState } from "react";
import { CharacterTurntable } from "@/components/character/CharacterTurntable";
import { CAMPUS_COMPONENTS, CAMPUS_FILES } from "./campus";
import { HouseCampus } from "./campus/HouseCampus";
import {
  HOUSE_LEVELS,
  type HouseLevel,
} from "./campus/house/house-upgrades";
import type { HomeSpotId } from "./world-landmasses";
import { homeSpotLabel } from "./world-landmasses";

type Props = {
  spot: HomeSpotId;
};

const LEVEL_LABEL: Record<HouseLevel, string> = {
  1: "Starter",
  2: "Yard",
  3: "Wing",
};

const STUDIO_CAMERA: Record<HomeSpotId, { position: [number, number, number]; fov: number }> = {
  cottage: { position: [2.4, 1.6, 3.3], fov: 40 },
  school: { position: [4.6, 2.7, 6.2], fov: 38 },
  pet: { position: [2.4, 1.6, 3.3], fov: 40 },
};

export function CampusStudio({ spot }: Props) {
  const Campus = CAMPUS_COMPONENTS[spot];
  const [houseLevel, setHouseLevel] = useState<HouseLevel>(1);
  const isHouse = spot === "cottage";
  const camera = STUDIO_CAMERA[spot];
  const ground = spot === "school" ? 4.8 : 2.4;

  return (
    <div className="relative h-full w-full">
      <Canvas
        key={spot}
        className="h-full w-full"
        dpr={[1, 1.5]}
        camera={{ position: camera.position, fov: camera.fov, near: 0.1, far: 40 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      >
        <color attach="background" args={["#c5e4f7"]} />
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#fff7ed", "#86c46a", 0.5]} />
        <directionalLight position={[3.2, 4.2, 2.6]} intensity={1.15} />
        <directionalLight position={[-2.4, 1.4, 1.6]} intensity={0.32} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
          <circleGeometry args={[ground, 48]} />
          <meshStandardMaterial color="#86c46a" roughness={0.92} metalness={0} />
        </mesh>
        <ContactShadows opacity={0.28} scale={spot === "school" ? 12 : 5} blur={2.2} far={2.4} />
        <CharacterTurntable idleSpin={false} initialYaw={0.35}>
          {isHouse ? <HouseCampus level={houseLevel} /> : <Campus />}
        </CharacterTurntable>
      </Canvas>
      {isHouse ? (
        <div className="pointer-events-none absolute top-24 left-4 z-10">
          <div className="pointer-events-auto w-56 rounded-xl bg-black/70 p-3 text-white shadow-lg backdrop-blur-sm">
            <p className="text-sm font-semibold">House upgrades</p>
            <p className="mt-1 text-[11px] text-white/55">Each level adds modules. The starter cottage stays.</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {HOUSE_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={houseLevel === level}
                  className={`rounded-md px-2.5 py-1.5 text-left text-xs font-semibold ${
                    houseLevel === level ? "bg-amber-300 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                  }`}
                  onClick={() => setHouseLevel(level)}
                >
                  {level}. {LEVEL_LABEL[level]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg bg-black/55 px-3 py-2 text-center text-[11px] text-white/80">
        {isHouse
          ? `${LEVEL_LABEL[houseLevel]} house. Drag to turn. Edit web/components/world/campus/house/HouseParts.tsx.`
          : `${homeSpotLabel(spot)} component. Drag to turn. Edit ${CAMPUS_FILES[spot]}.`}
      </p>
    </div>
  );
}

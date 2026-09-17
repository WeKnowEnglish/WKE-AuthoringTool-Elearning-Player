"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { nearPoint } from "@/lib/world/play-move";
import {
  houseInsideBounds,
  houseInsideDoor,
  houseInsideSpawn,
  houseInsideWalls,
  leftInterior,
  schoolInsideBounds,
  schoolInsideDoor,
  schoolInsideSpawn,
  schoolInsideWalls,
} from "@/lib/world/play-layout";
import { playSpotLabel, type PlaySpotId } from "@/lib/world/play-spots";
import { HouseInterior } from "./HouseInterior";
import { MovePad } from "./MovePad";
import { SchoolClassroom } from "./SchoolClassroom";
import { PlayPlayer } from "./PlayPlayer";
import { furnitureWalls } from "@/lib/house/house-collision";
import { loadHouseLayout } from "@/lib/house/house-storage";
import { STARTER_HOUSE } from "@/lib/house/house-normalize";

type Props = {
  spot: Exclude<PlaySpotId, "pet">;
  backHref: string;
  designHref?: string;
};

export function CampusPlaySpace({ spot, backHref, designHref }: Props) {
  const router = useRouter();
  const [layout, setLayout] = useState(STARTER_HOUSE);
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const [nearDoor, setNearDoor] = useState(false);
  const nearDoorRef = useRef(false);
  const leavingRef = useRef(false);

  const spawn = spot === "cottage" ? houseInsideSpawn() : schoolInsideSpawn();
  const door = spot === "cottage" ? houseInsideDoor() : schoolInsideDoor();
  const walls = useMemo(() => {
    if (spot === "cottage") return [...houseInsideWalls(), ...furnitureWalls(layout)];
    return schoolInsideWalls();
  }, [spot, layout]);
  const clampBounds = spot === "cottage" ? houseInsideBounds() : schoolInsideBounds();
  const doorRef = useRef(door);
  doorRef.current = door;

  useEffect(() => {
    if (spot !== "cottage") return;
    setLayout(loadHouseLayout());
  }, [spot]);

  const goOutside = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    router.push(backHref);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#f4efe6]">
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.15, spawn.z + 3.05], fov: 50, near: 0.1, far: 80 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      >
        <color attach="background" args={["#f4efe6"]} />
        <ambientLight intensity={0.72} />
        <hemisphereLight args={["#fff7ed", "#d6d3d1", 0.7]} />
        <directionalLight position={[4, 8, 5]} intensity={0.7} />
        <pointLight position={[0, 2.6, 0]} intensity={1.15} distance={18} />
        {spot === "cottage" ? <HouseInterior layout={layout} /> : <SchoolClassroom />}
        <PlayPlayer
          key={spot}
          spawn={spawn}
          walls={walls}
          clampBounds={clampBounds}
          stick={stick}
          cameraOffset={[0, 2.15, 3.05]}
          onMove={(x, z) => {
            if (leftInterior(spot, x, z)) {
              goOutside();
              return;
            }
            const next = nearPoint(x, z, doorRef.current.x, doorRef.current.z, 1.35);
            if (next !== nearDoorRef.current) {
              nearDoorRef.current = next;
              setNearDoor(next);
            }
          }}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{playSpotLabel(spot)}</p>
          <p className="text-xs text-slate-700">Walk around inside. Walk out the door to go back to the globe.</p>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Link href={backHref} className="rounded-md bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white">
            Back to globe
          </Link>
          {designHref ? (
            <Link href={designHref} className="rounded-md bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white">
              Decorate
            </Link>
          ) : null}
        </div>
      </div>

      {nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={goOutside}
          >
            Back to globe
          </button>
        </div>
      ) : null}

      <MovePad onChange={setStick} />
    </div>
  );
}

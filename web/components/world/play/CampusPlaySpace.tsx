"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HouseCampus } from "../campus/HouseCampus";
import { SchoolCampus } from "../campus/SchoolCampus";
import { nearPoint } from "@/lib/world/play-move";
import {
  PLAY_SCALE,
  YARD_RADIUS,
  houseInsideBounds,
  houseInsideDoor,
  houseInsideSpawn,
  houseInsideWalls,
  leftInterior,
  schoolInsideBounds,
  schoolInsideDoor,
  schoolInsideSpawn,
  schoolInsideWalls,
  yardDoor,
  yardSpawn,
  yardWalls,
} from "@/lib/world/play-layout";
import { playSpotLabel, type PlaySpotId } from "@/lib/world/play-spots";
import { HouseInterior } from "./HouseInterior";
import { SchoolClassroom } from "./SchoolClassroom";
import { PlayPlayer } from "./PlayPlayer";

type Zone = "yard" | "inside";

type Props = {
  spot: PlaySpotId;
  backHref: string;
};

export function CampusPlaySpace({ spot, backHref }: Props) {
  const [zone, setZone] = useState<Zone>("yard");
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const [nearDoor, setNearDoor] = useState(false);
  const nearDoorRef = useRef(false);
  const zoneRef = useRef<Zone>(zone);
  zoneRef.current = zone;
  const scale = PLAY_SCALE[spot];
  const spawn =
    zone === "yard" ? yardSpawn(spot) : spot === "cottage" ? houseInsideSpawn() : schoolInsideSpawn();
  const door = zone === "yard" ? yardDoor(spot) : spot === "cottage" ? houseInsideDoor() : schoolInsideDoor();
  const walls = useMemo(() => {
    if (zone === "yard") return yardWalls(spot);
    return spot === "cottage" ? houseInsideWalls() : schoolInsideWalls();
  }, [spot, zone]);
  const clampBounds = zone === "inside" ? (spot === "cottage" ? houseInsideBounds() : schoolInsideBounds()) : undefined;
  const doorRef = useRef(door);
  doorRef.current = door;

  const goInside = () => {
    nearDoorRef.current = false;
    setNearDoor(false);
    zoneRef.current = "inside";
    setZone("inside");
  };

  const goOutside = () => {
    nearDoorRef.current = false;
    setNearDoor(false);
    zoneRef.current = "yard";
    setZone("yard");
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#87c4ef]">
      <Canvas
        className="h-full w-full"
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.4, spawn.z + 6.2], fov: 50, near: 0.1, far: 80 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      >
        <color attach="background" args={[zone === "yard" ? "#87c4ef" : "#f4efe6"]} />
        <ambientLight intensity={0.72} />
        <hemisphereLight args={["#fff7ed", zone === "yard" ? "#86c46a" : "#d6d3d1", zone === "yard" ? 0.48 : 0.7]} />
        <directionalLight position={[4, 8, 5]} intensity={zone === "yard" ? 1.1 : 0.7} />
        {zone === "inside" ? <pointLight position={[0, 2.6, 0]} intensity={1.15} distance={18} /> : null}
        {zone === "yard" ? (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <circleGeometry args={[YARD_RADIUS + 0.4, 48]} />
              <meshStandardMaterial color="#7fbf63" roughness={0.92} metalness={0} />
            </mesh>
            <group scale={scale}>
              {spot === "cottage" ? <HouseCampus level={2} /> : <SchoolCampus />}
            </group>
          </>
        ) : spot === "cottage" ? (
          <HouseInterior />
        ) : (
          <SchoolClassroom />
        )}
        <PlayPlayer
          key={`${spot}-${zone}`}
          spawn={spawn}
          walls={walls}
          clampRadius={zone === "yard" ? YARD_RADIUS : undefined}
          clampBounds={clampBounds}
          stick={stick}
          cameraOffset={zone === "yard" ? [0, 3.4, 6.2] : [0, 2.15, 3.05]}
          onMove={(x, z) => {
            if (zoneRef.current === "inside" && leftInterior(spot, x, z)) {
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
          <p className="text-xs text-slate-700">
            {zone === "yard"
              ? "Walk the garden. Stand at the door to go inside."
              : "Walk around inside. Walk out the door to go back to the garden."}
          </p>
        </div>
        <Link
          href={backHref}
          className="pointer-events-auto rounded-md bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-white"
        >
          Back to map
        </Link>
      </div>

      {nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={zone === "yard" ? goInside : goOutside}
          >
            {zone === "yard" ? "Go inside" : "Go outside"}
          </button>
        </div>
      ) : null}

      <MovePad onChange={setStick} />
    </div>
  );
}

function MovePad({ onChange }: { onChange: (stick: { x: number; z: number }) => void }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pointerId = useRef<number | null>(null);

  const release = () => {
    pointerId.current = null;
    onChangeRef.current({ x: 0, z: 0 });
  };

  useEffect(() => {
    const onLost = (event: PointerEvent) => {
      if (pointerId.current != null && event.pointerId === pointerId.current) release();
    };
    const onBlur = () => release();
    window.addEventListener("pointerup", onLost);
    window.addEventListener("pointercancel", onLost);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onLost);
      window.removeEventListener("pointercancel", onLost);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const press = (x: number, z: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerId.current = event.pointerId;
    onChange({ x, z });
  };

  const btn =
    "rounded-md bg-black/45 px-3 py-2 text-sm font-bold text-white active:bg-black/70 touch-none select-none";
  return (
    <div className="pointer-events-none absolute bottom-5 left-4 z-10">
      <div className="pointer-events-auto grid w-36 grid-cols-3 gap-1">
        <span />
        <button type="button" className={btn} onPointerDown={press(0, -1)} onPointerUp={release} onLostPointerCapture={release}>
          ↑
        </button>
        <span />
        <button type="button" className={btn} onPointerDown={press(-1, 0)} onPointerUp={release} onLostPointerCapture={release}>
          ←
        </button>
        <button type="button" className={btn} onPointerDown={press(0, 1)} onPointerUp={release} onLostPointerCapture={release}>
          ↓
        </button>
        <button type="button" className={btn} onPointerDown={press(1, 0)} onPointerUp={release} onLostPointerCapture={release}>
          →
        </button>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-slate-800">or WASD</p>
    </div>
  );
}

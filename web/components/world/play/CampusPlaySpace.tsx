"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { nearestSchoolSpecial, type SchoolSpecialId } from "@/lib/world/school-specials";
import type { WorldPromptId } from "@/lib/world/world-prompts";
import { HouseInterior } from "./HouseInterior";
import { MovePad } from "./MovePad";
import { SchoolClassroom } from "./SchoolClassroom";
import { PlayPlayer } from "./PlayPlayer";
import { WardrobePanel } from "./WardrobePanel";
import { WorldPromptPanel } from "./WorldPromptPanel";
import { furnitureWalls } from "@/lib/house/house-collision";
import {
  ensureHouseSpecials,
  nearFridge as isNearFridge,
  nearWardrobe as isNearWardrobe,
} from "@/lib/house/house-specials";
import { loadHouseLayout } from "@/lib/house/house-storage";
import { STARTER_HOUSE } from "@/lib/house/house-normalize";
import { loadPlayAvatarLook } from "@/lib/world/play-avatar";

type Props = {
  spot: Exclude<PlaySpotId, "pet">;
  backHref: string;
  designHref?: string;
  surface?: "student" | "pilot";
};

type Panel = "wardrobe" | "prompt" | null;

export function CampusPlaySpace({ spot, backHref, designHref, surface = "student" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [layout, setLayout] = useState(STARTER_HOUSE);
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const [nearDoor, setNearDoor] = useState(false);
  const [nearWardrobe, setNearWardrobe] = useState(false);
  const [nearFridge, setNearFridge] = useState(false);
  const [schoolSpecial, setSchoolSpecial] = useState<SchoolSpecialId | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [promptId, setPromptId] = useState<WorldPromptId>("clothes");
  const [avatarConfig, setAvatarConfig] = useState(() => loadPlayAvatarLook().config);
  const nearDoorRef = useRef(false);
  const nearWardrobeRef = useRef(false);
  const nearFridgeRef = useRef(false);
  const schoolSpecialRef = useRef<SchoolSpecialId | null>(null);
  const leavingRef = useRef(false);
  const promptIdRef = useRef(promptId);

  const spawn = spot === "cottage" ? houseInsideSpawn() : schoolInsideSpawn();
  const door = spot === "cottage" ? houseInsideDoor() : schoolInsideDoor();
  const walls = useMemo(() => {
    if (spot === "cottage") return [...houseInsideWalls(), ...furnitureWalls(layout)];
    return schoolInsideWalls();
  }, [spot, layout]);
  const clampBounds = spot === "cottage" ? houseInsideBounds() : schoolInsideBounds();
  const doorRef = useRef(door);
  const layoutRef = useRef(layout);
  const returnTo = `${pathname}?inside=1`;
  const anyPanel = panel != null;

  useEffect(() => {
    promptIdRef.current = promptId;
  }, [promptId]);

  useEffect(() => {
    doorRef.current = door;
    layoutRef.current = layout;
  }, [door, layout]);

  useEffect(() => {
    if (spot !== "cottage") return;
    const frame = window.requestAnimationFrame(() => {
      setLayout(ensureHouseSpecials(loadHouseLayout()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [spot]);

  useEffect(() => {
    const refresh = () => setAvatarConfig(loadPlayAvatarLook().config);
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const goOutside = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    router.push(backHref);
  };

  const openPrompt = (id: WorldPromptId) => {
    setPromptId(id);
    setPanel("prompt");
  };

  const hint =
    spot === "cottage"
      ? "Wardrobe: change your look. Fridge: food words. Door: back to the globe."
      : "Walk to the desk or board to practice English. Door: back to the globe.";

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
            const atDoor = nearPoint(x, z, doorRef.current.x, doorRef.current.z, 1.35);
            if (atDoor !== nearDoorRef.current) {
              nearDoorRef.current = atDoor;
              setNearDoor(atDoor);
            }
            if (spot === "cottage") {
              const atWardrobe = isNearWardrobe(layoutRef.current, x, z);
              if (atWardrobe !== nearWardrobeRef.current) {
                nearWardrobeRef.current = atWardrobe;
                setNearWardrobe(atWardrobe);
                if (!atWardrobe) setPanel((open) => (open === "wardrobe" ? null : open));
              }
              const atFridge = isNearFridge(layoutRef.current, x, z);
              if (atFridge !== nearFridgeRef.current) {
                nearFridgeRef.current = atFridge;
                setNearFridge(atFridge);
                if (!atFridge) {
                  setPanel((open) =>
                    open === "prompt" && promptIdRef.current === "fridge" ? null : open,
                  );
                }
              }
            } else {
              const nextSchool = nearestSchoolSpecial(x, z);
              if (nextSchool !== schoolSpecialRef.current) {
                schoolSpecialRef.current = nextSchool;
                setSchoolSpecial(nextSchool);
                if (!nextSchool) {
                  setPanel((open) =>
                    open === "prompt" &&
                    (promptIdRef.current === "desk" || promptIdRef.current === "board")
                      ? null
                      : open,
                  );
                }
              }
            }
          }}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{playSpotLabel(spot)}</p>
          <p className="text-xs text-slate-700">{hint}</p>
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

      {!anyPanel && nearDoor ? (
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

      {!anyPanel && nearWardrobe && !nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={() => setPanel("wardrobe")}
          >
            Open wardrobe
          </button>
        </div>
      ) : null}

      {!anyPanel && nearFridge && !nearWardrobe && !nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={() => openPrompt("fridge")}
          >
            Check the fridge
          </button>
        </div>
      ) : null}

      {!anyPanel && schoolSpecial === "desk" && !nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-violet-300 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={() => openPrompt("desk")}
          >
            Look at the desk
          </button>
        </div>
      ) : null}

      {!anyPanel && schoolSpecial === "board" && !nearDoor ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-violet-300 px-4 py-2 text-sm font-semibold text-slate-900"
            onClick={() => openPrompt("board")}
          >
            Look at the board
          </button>
        </div>
      ) : null}

      {panel === "wardrobe" ? (
        <WardrobePanel
          returnTo={returnTo}
          surface={surface}
          onClose={() => setPanel(null)}
          onPractice={() => openPrompt("clothes")}
        />
      ) : null}

      {panel === "prompt" ? (
        <WorldPromptPanel promptId={promptId} config={avatarConfig} onClose={() => setPanel(null)} />
      ) : null}

      <MovePad onChange={setStick} />
    </div>
  );
}

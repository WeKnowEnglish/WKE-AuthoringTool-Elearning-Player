"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { CloudLayer } from "./CloudLayer";
import { GlobeControls, type GlobePick } from "./GlobeControls";
import { GlobeLandmarks } from "./GlobeLandmarks";
import { GlobePlaceholder } from "./GlobePlaceholder";
import { GlobeWalkCamera } from "./GlobeWalkCamera";
import { GlobePlayer } from "./play/GlobePlayer";
import {
  CAMERA_FOV,
  DEFAULT_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  SCENE_BACKGROUND,
  cameraPositionFromDistance,
  defaultCameraDistance,
} from "./globe-config";
import { WorldCamera } from "./WorldCamera";
import type { GlobeFocus } from "./look-at-hub";
import { selectionFromLandmass, type HomeSpotId, type WorldSelection } from "./world-landmasses";
import { spawnOnGlobe, type GlobePose } from "@/lib/world/globe-walk";

type Stick = { x: number; z: number };

type Props = {
  focus?: GlobeFocus | null;
  focusedLandmassId?: string | null;
  focusedSpot?: HomeSpotId | null;
  editMode?: boolean;
  selectedPlacementId?: string | null;
  walkMode?: boolean;
  spawnSpot?: HomeSpotId | null;
  spawnKey?: number;
  stick?: Stick;
  onSelect?: (selection: WorldSelection | null) => void;
  onEditPick?: (placementId: string | null) => void;
  onEditMove?: (pick: GlobePick) => void;
  onNearSpot?: (spot: HomeSpotId | null) => void;
};

export function GlobeScene({
  focus,
  focusedLandmassId,
  focusedSpot,
  editMode,
  selectedPlacementId,
  walkMode = false,
  spawnSpot = null,
  spawnKey = 0,
  stick,
  onSelect,
  onEditPick,
  onEditMove,
  onNearSpot,
}: Props) {
  const globeRef = useRef<Group>(null);
  const distanceRef = useRef(DEFAULT_CAMERA_DISTANCE);
  const poseRef = useRef<GlobePose>(spawnOnGlobe(spawnSpot));

  useEffect(() => {
    distanceRef.current = defaultCameraDistance(window.innerWidth);
  }, []);

  useEffect(() => {
    if (!walkMode) return;
    poseRef.current = spawnOnGlobe(spawnSpot);
  }, [spawnKey, spawnSpot, walkMode]);

  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{
        position: cameraPositionFromDistance(distanceRef.current),
        fov: CAMERA_FOV,
        near: 0.1,
        far: MAX_CAMERA_DISTANCE + 20,
      }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#fff7ed", "#4d7c3a", 0.58]} />
      <directionalLight position={[2.4, 4.6, 3.8]} intensity={1.45} />
      <directionalLight position={[-2.8, 1.4, 0.6]} intensity={0.4} />
      <directionalLight position={[-3.2, 0.8, -1.6]} intensity={0.22} />
      {walkMode ? (
        <GlobeWalkCamera globeRef={globeRef} poseRef={poseRef} />
      ) : (
        <WorldCamera distanceRef={distanceRef} />
      )}
      {walkMode ? null : (
        <GlobeControls
          globeRef={globeRef}
          distanceRef={distanceRef}
          focus={focus}
          editMode={editMode}
          selectedPlacementId={selectedPlacementId}
          onEditPick={onEditPick}
          onEditMove={onEditMove}
          onPick={(pick) => {
            if (!pick) {
              onSelect?.(null);
              return;
            }
            const next = selectionFromLandmass(pick.landmassId, pick.spot);
            onSelect?.(next ? { ...next, lookLat: pick.lat, lookLon: pick.lon } : null);
          }}
        />
      )}
      <group ref={globeRef} name="globeRoot">
        <GlobePlaceholder />
        <GlobeLandmarks focusedLandmassId={focusedLandmassId} focusedSpot={focusedSpot} focus={focus} />
        <CloudLayer />
        {walkMode ? (
          <GlobePlayer spawnSpot={spawnSpot} spawnKey={spawnKey} stick={stick} poseRef={poseRef} onNearSpot={onNearSpot} />
        ) : null}
      </group>
    </Canvas>
  );
}

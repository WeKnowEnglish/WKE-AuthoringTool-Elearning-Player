"use client";

import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { placeOnLandmass, pointAlongNormal } from "./place-on-land";
import { WORLD_ZONES, type WorldLandmass } from "./world-landmasses";

const CAMERA_DIR = new Vector3();
const WORLD_POS = new Vector3();

export function WorldLabel({
  landmass,
  facingDot = 0.42,
}: {
  landmass: WorldLandmass;
  facingDot?: number;
}) {
  const rootRef = useRef<Group>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const facingDotRef = useRef(facingDot);
  facingDotRef.current = facingDot;
  const zone = WORLD_ZONES[landmass.zone];
  const pose = useMemo(() => placeOnLandmass(landmass, 0, 0, 0.16), [landmass]);
  const position = useMemo(
    () => pointAlongNormal(pose.lat, pose.lon, pose.radius),
    [pose.lat, pose.lon, pose.radius],
  );

  useFrame(({ camera }) => {
    const root = rootRef.current;
    if (!root) return;
    root.getWorldPosition(WORLD_POS);
    const distance = camera.position.distanceTo(WORLD_POS);
    CAMERA_DIR.copy(camera.position).normalize();
    const facing = CAMERA_DIR.dot(WORLD_POS.normalize());
    const show = facing > facingDotRef.current && distance > 3.35;
    root.visible = show;
    if (chipRef.current) chipRef.current.style.opacity = show ? "1" : "0";
  });

  return (
    <group ref={rootRef} name={`label-${landmass.id}`} position={position}>
      <Billboard follow>
        <Html center distanceFactor={4.4} pointerEvents="none" style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <div
            ref={chipRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(15, 23, 42, 0.72)",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
              opacity: 0,
              transition: "opacity 120ms linear",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "#38bdf8",
                color: "#0f172a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
              }}
            >
              {zone.journeyOrder}
            </span>
            {zone.shortLabel}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

/** Close-up chip for a campus spot. Hidden on the whole map. */
export function SpotLabel({
  landmass,
  localX,
  localZ,
  text,
  active = false,
}: {
  landmass: WorldLandmass;
  localX: number;
  localZ: number;
  text: string;
  active?: boolean;
}) {
  const rootRef = useRef<Group>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const pose = useMemo(() => placeOnLandmass(landmass, localX, localZ, 0.12), [landmass, localX, localZ]);
  const position = useMemo(
    () => pointAlongNormal(pose.lat, pose.lon, pose.radius),
    [pose.lat, pose.lon, pose.radius],
  );

  useFrame(({ camera }) => {
    const root = rootRef.current;
    if (!root) return;
    root.getWorldPosition(WORLD_POS);
    const distance = camera.position.distanceTo(WORLD_POS);
    CAMERA_DIR.copy(camera.position).normalize();
    const facing = CAMERA_DIR.dot(WORLD_POS.normalize());
    const show = facing > 0.12 && distance < 3.8;
    root.visible = show;
    if (chipRef.current) chipRef.current.style.opacity = show ? "1" : "0";
  });

  return (
    <group ref={rootRef} name={`spot-${text}`} position={position}>
      <Billboard follow>
        <Html center distanceFactor={2.8} pointerEvents="none" style={{ pointerEvents: "none" }} zIndexRange={[24, 0]}>
          <div
            ref={chipRef}
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              background: active ? "rgba(56, 189, 248, 0.92)" : "rgba(15, 23, 42, 0.72)",
              color: active ? "#0f172a" : "white",
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: "nowrap",
              opacity: 0,
              transition: "opacity 120ms linear",
            }}
          >
            {text}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { HouseDesignerCamera } from "./HouseDesignerCamera";
import { HouseFurnitureMesh } from "./HouseFurniture";
import { HouseRoom } from "./HouseRoom";
import { canPlaceItem, snapItem } from "@/lib/house/house-grid";
import type { HouseDesignerCamera as Cam, HouseFurnitureId, HouseInteriorLayout, HouseRot } from "@/lib/house/house-types";

type Props = {
  layout: HouseInteriorLayout;
  view: Cam;
  selectedId: string | null;
  holding: HouseFurnitureId | null;
  holdRot: HouseRot;
  onSelectItem: (id: string | null) => void;
  onPlace: (x: number, z: number) => void;
};

export function HouseDesignerScene({
  layout,
  view,
  selectedId,
  holding,
  holdRot,
  onSelectItem,
  onPlace,
}: Props) {
  const [ghost, setGhost] = useState<{ x: number; z: number; ok: boolean } | null>(null);
  const ghostItem = useMemo(() => {
    if (!holding || !ghost) return null;
    const snapped = snapItem(holding, ghost.x, ghost.z, holdRot);
    return { id: "__ghost__", kind: holding, rot: holdRot, ...snapped };
  }, [ghost, holdRot, holding]);

  return (
    <Canvas
      className="h-full w-full"
      dpr={[1, 1.5]}
      camera={{ position: [7.4, 5.1, 7.4], fov: 46, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onPointerMissed={() => onSelectItem(null)}
    >
      <color attach="background" args={["#f4efe6"]} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={["#fff7ed", "#d6d3d1", 0.7]} />
      <directionalLight position={[4, 8, 5]} intensity={0.85} />
      <pointLight position={[0, 2.6, 0]} intensity={1.05} distance={18} />
      <HouseDesignerCamera view={view} />
      <HouseRoom
        layout={layout}
        selectedId={selectedId}
        holding={holding != null}
        onSelectItem={onSelectItem}
        onPlace={onPlace}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onPointerMove={(event) => {
          if (!holding) {
            setGhost(null);
            return;
          }
          const snapped = snapItem(holding, event.point.x, event.point.z, holdRot);
          const ok = canPlaceItem(layout.items, { id: "__ghost__", kind: holding, rot: holdRot, ...snapped }) == null;
          setGhost({ x: event.point.x, z: event.point.z, ok });
        }}
        onPointerOut={() => setGhost(null)}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (!holding) {
            onSelectItem(null);
            return;
          }
          onPlace(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[10.4, 10.4]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {ghostItem ? (
        <group position={[ghostItem.x, 0.02, ghostItem.z]}>
          <HouseFurnitureMesh kind={ghostItem.kind} rot={ghostItem.rot} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
            <circleGeometry args={[0.55, 20]} />
            <meshBasicMaterial color={ghost?.ok ? "#86efac" : "#fca5a5"} transparent opacity={0.35} />
          </mesh>
        </group>
      ) : null}
    </Canvas>
  );
}

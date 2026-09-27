"use client";

import { Box } from "../world/campus/campus-primitives";
import { PatternedBox } from "../world/play/room-surfaces";
import { PAINT_COLORS } from "@/lib/house/house-catalog";
import { rotatedFootprint } from "@/lib/house/house-grid";
import type { HouseFloorId, HouseInteriorLayout, HouseWallId } from "@/lib/house/house-types";
import { HouseFurnitureMesh } from "./HouseFurniture";

const TRIM = "#f8fafc";

function FloorBox({ id, args, position }: { id: HouseFloorId; args: [number, number, number]; position: [number, number, number] }) {
  if (id === "wood" || id === "checkers") {
    return <PatternedBox args={args} position={position} kind={id} roughness={0.9} />;
  }
  return <Box args={args} position={position} tone={{ color: PAINT_COLORS[id] ?? "#93c5fd", roughness: 0.92 }} />;
}

function WallBox({ id, args, position }: { id: HouseWallId; args: [number, number, number]; position: [number, number, number] }) {
  if (id === "stripes") {
    return <PatternedBox args={args} position={position} kind="stripes" />;
  }
  return <Box args={args} position={position} tone={{ color: PAINT_COLORS[id] ?? "#e8d5b5", roughness: 0.88 }} />;
}

type Props = {
  layout: HouseInteriorLayout;
  selectedId?: string | null;
  holding?: boolean;
  onSelectItem?: (id: string) => void;
  onPlace?: (x: number, z: number) => void;
};

export function HouseRoom({ layout, selectedId, holding, onSelectItem, onPlace }: Props) {
  return (
    <group name="house-interior">
      <FloorBox id={layout.floor} args={[10.4, 0.12, 10.4]} position={[0, -0.06, 0]} />
      <WallBox id={layout.walls} args={[10.6, 3.1, 0.28]} position={[0, 1.5, -5.15]} />
      <WallBox id={layout.walls} args={[0.28, 3.1, 10.6]} position={[-5.15, 1.5, 0]} />
      <WallBox id={layout.walls} args={[0.28, 3.1, 10.6]} position={[5.15, 1.5, 0]} />
      <WallBox id={layout.walls} args={[4.2, 3.1, 0.28]} position={[-3.2, 1.5, 5.15]} />
      <WallBox id={layout.walls} args={[4.2, 3.1, 0.28]} position={[3.2, 1.5, 5.15]} />
      <Box args={[2.4, 0.28, 0.28]} position={[0, 2.86, 5.15]} tone={{ color: TRIM }} />
      {layout.items.map((item) => {
        const size = rotatedFootprint(item.kind, item.rot);
        return (
          <group
            key={item.id}
            position={[item.x, 0, item.z]}
            onPointerDown={
              onSelectItem || onPlace
                ? (event) => {
                    event.stopPropagation();
                    if (holding) {
                      onPlace?.(event.point.x, event.point.z);
                      return;
                    }
                    onSelectItem?.(item.id);
                  }
                : undefined
            }
          >
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[Math.max(0.6, size.w), 0.9, Math.max(0.6, size.d)]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <HouseFurnitureMesh kind={item.kind} rot={item.rot} selected={selectedId === item.id} />
          </group>
        );
      })}
    </group>
  );
}

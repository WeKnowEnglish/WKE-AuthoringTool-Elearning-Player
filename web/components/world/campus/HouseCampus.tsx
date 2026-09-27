"use client";

import type { ComponentType } from "react";
import {
  HouseBody,
  HouseChimney,
  HouseDoor,
  HouseDormer,
  HouseGarden,
  HouseLantern,
  HouseMailbox,
  HousePath,
  HousePlanters,
  HousePorch,
  HouseRoof,
  HouseTurret,
  HouseWindows,
  HouseWing,
} from "./house/HouseParts";
import {
  DEFAULT_HOUSE_LEVEL,
  houseHitSize,
  houseModulesForLevel,
  type HouseLevel,
  type HouseModuleId,
} from "./house/house-upgrades";

const HOUSE_PARTS: Record<HouseModuleId, ComponentType> = {
  body: HouseBody,
  roof: HouseRoof,
  chimney: HouseChimney,
  door: HouseDoor,
  windows: HouseWindows,
  planters: HousePlanters,
  mailbox: HouseMailbox,
  path: HousePath,
  porch: HousePorch,
  lantern: HouseLantern,
  garden: HouseGarden,
  wing: HouseWing,
  turret: HouseTurret,
  dormer: HouseDormer,
};

type Props = {
  level?: HouseLevel;
};

/** Storybook cottage. Higher levels add modules; the starter house always stays. */
export function HouseCampus({ level = DEFAULT_HOUSE_LEVEL }: Props) {
  const modules = houseModulesForLevel(level);
  const hit = houseHitSize(level);
  return (
    <group name="house">
      {modules.map((id) => {
        const Part = HOUSE_PARTS[id];
        return <Part key={id} />;
      })}
      <mesh visible={false} position={[0, hit[1] / 2, 0.08]} name="house-hit">
        <boxGeometry args={hit} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

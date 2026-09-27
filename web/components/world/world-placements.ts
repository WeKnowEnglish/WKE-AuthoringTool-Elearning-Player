import { HOME_LOCALS, type HomeSpotId } from "./world-landmasses";

export type PlacementKit = "cottage" | "school" | "pet" | "palm" | "rocks" | "flowers";

export type WorldPlacement = {
  id: string;
  landmassId: string;
  label: string;
  localX: number;
  localZ: number;
  scale: number;
  yaw?: number;
  spot?: HomeSpotId;
  kit: PlacementKit;
  showLabel?: string;
};

export const DEFAULT_WORLD_PLACEMENTS: WorldPlacement[] = [
  {
    id: "home-cottage",
    landmassId: "home",
    label: "House",
    localX: HOME_LOCALS.cottage.localX,
    localZ: HOME_LOCALS.cottage.localZ,
    scale: 0.18,
    yaw: HOME_LOCALS.cottage.yaw,
    spot: "cottage",
    kit: "cottage",
    showLabel: "House",
  },
  {
    id: "home-school",
    landmassId: "home",
    label: "School",
    localX: HOME_LOCALS.school.localX,
    localZ: HOME_LOCALS.school.localZ,
    scale: 0.14,
    yaw: HOME_LOCALS.school.yaw,
    spot: "school",
    kit: "school",
    showLabel: "School",
  },
  {
    id: "home-pet",
    landmassId: "home",
    label: "Pet yard",
    localX: HOME_LOCALS.pet.localX,
    localZ: HOME_LOCALS.pet.localZ,
    scale: 0.18,
    yaw: HOME_LOCALS.pet.yaw,
    spot: "pet",
    kit: "pet",
    showLabel: "Pet",
  },
  { id: "home-palm", landmassId: "home", label: "Palm", localX: -0.78, localZ: 0.42, scale: 0.18, yaw: 0.4, kit: "palm" },
  { id: "home-palm-small", landmassId: "home", label: "Small palm", localX: -0.18, localZ: 0.62, scale: 0.12, yaw: -0.6, kit: "palm" },
  { id: "home-rocks", landmassId: "home", label: "Rocks", localX: -0.7, localZ: -0.16, scale: 0.16, kit: "rocks" },
  { id: "home-flowers", landmassId: "home", label: "Flowers", localX: 0.22, localZ: 0.28, scale: 0.12, kit: "flowers" },
  { id: "home-school-flowers", landmassId: "home", label: "School flowers", localX: 0.72, localZ: 0.16, scale: 0.11, kit: "flowers" },
];

export function homeLocalsFromPlacements(
  placements: WorldPlacement[],
): Record<HomeSpotId, { localX: number; localZ: number; yaw?: number }> {
  const locals = {
    cottage: { ...HOME_LOCALS.cottage },
    school: { ...HOME_LOCALS.school },
    pet: { ...HOME_LOCALS.pet },
  };
  for (const placement of placements) {
    if (!placement.spot) continue;
    locals[placement.spot] = {
      localX: placement.localX,
      localZ: placement.localZ,
      yaw: placement.yaw,
    };
  }
  return locals;
}

export function formatPlacementsAsCode(placements: WorldPlacement[]): string {
  const lines = placements.map((placement) => {
    const yaw = placement.yaw == null ? "" : `, yaw: ${round(placement.yaw)}`;
    return `  ${placement.id}: { localX: ${round(placement.localX)}, localZ: ${round(placement.localZ)}${yaw}, scale: ${round(placement.scale)} }`;
  });
  return `{\n${lines.join(",\n")}\n}`;
}

function round(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

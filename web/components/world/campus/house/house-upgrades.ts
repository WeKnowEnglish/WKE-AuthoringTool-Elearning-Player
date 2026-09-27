export const HOUSE_LEVELS = [1, 2, 3] as const;
export type HouseLevel = (typeof HOUSE_LEVELS)[number];

export const HOUSE_MODULE_IDS = [
  "body",
  "roof",
  "chimney",
  "door",
  "windows",
  "planters",
  "mailbox",
  "path",
  "porch",
  "lantern",
  "garden",
  "wing",
  "turret",
  "dormer",
] as const;

export type HouseModuleId = (typeof HOUSE_MODULE_IDS)[number];

export const HOUSE_MODULES: Record<HouseModuleId, { label: string; minLevel: HouseLevel }> = {
  body: { label: "Body", minLevel: 1 },
  roof: { label: "Roof", minLevel: 1 },
  chimney: { label: "Chimney", minLevel: 1 },
  door: { label: "Door", minLevel: 1 },
  windows: { label: "Windows", minLevel: 1 },
  planters: { label: "Planters", minLevel: 1 },
  mailbox: { label: "Mailbox", minLevel: 1 },
  path: { label: "Path", minLevel: 1 },
  porch: { label: "Yard", minLevel: 2 },
  lantern: { label: "Lantern", minLevel: 2 },
  garden: { label: "Garden", minLevel: 2 },
  wing: { label: "Side wing", minLevel: 3 },
  turret: { label: "Turret", minLevel: 3 },
  dormer: { label: "Dormer", minLevel: 3 },
};

export const DEFAULT_HOUSE_LEVEL: HouseLevel = 1;

export function isHouseLevel(value: number): value is HouseLevel {
  return value === 1 || value === 2 || value === 3;
}

export function houseModulesForLevel(level: HouseLevel): HouseModuleId[] {
  return HOUSE_MODULE_IDS.filter((id) => HOUSE_MODULES[id].minLevel <= level);
}

export function houseHitSize(level: HouseLevel): [number, number, number] {
  if (level >= 3) return [2.15, 1.55, 1.95];
  if (level >= 2) return [1.55, 1.25, 1.85];
  return [1.45, 1.15, 1.45];
}

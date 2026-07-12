import {
  GRASS_TILE_SIZE_PX,
  grassTileColCenterPx,
  grassTileRowTopPx,
} from "@/lib/live-game/tiles/grass-tile-pack";
import type { EnglishCraftResourceType } from "@/lib/live-game/modes/english-craft/english-craft-art";
import {
  buildBlockedMapCells,
  listAvailableMapCells,
  pickSpreadCells,
} from "@/lib/live-game/modes/english-craft/map-placement-v1";
import {
  ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX,
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
  ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX,
  ENGLISH_CRAFT_STORAGE_INTERACT_RADIUS_PX,
  ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import type { InteractablePoint } from "@/lib/live-game/engine/interact";

/** Grass tiles stack to rowIndex + 1 (max 11 on the pilot map). */
export const ENGLISH_CRAFT_OBJECTS_Z_BASE = 20;

export type EnglishCraftResourceNodeDef = {
  id: string;
  resourceType: EnglishCraftResourceType;
  label: string;
  col: number;
  row: number;
  x: number;
  y: number;
  interactRadius: number;
};

/** @deprecated Use EnglishCraftResourceNodeDef */
export type EnglishCraftWoodTreeDef = EnglishCraftResourceNodeDef;

function resourceNodeAt(
  id: string,
  resourceType: EnglishCraftResourceType,
  label: string,
  col: number,
  row: number,
): EnglishCraftResourceNodeDef {
  return {
    id,
    resourceType,
    label,
    col,
    row,
    x: grassTileColCenterPx(col),
    y: grassTileRowTopPx(row) + GRASS_TILE_SIZE_PX * 0.82,
    interactRadius: ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX,
  };
}

export type EnglishCraftStructureKind =
  | "workbench"
  | "bridge"
  | "flag"
  | "dock"
  | "log_storage"
  | "stone_storage"
  | "wheat_storage"
  | "cotton_storage";

export type EnglishCraftStructureDef = {
  id: string;
  kind: EnglishCraftStructureKind;
  resourceType?: EnglishCraftResourceType;
  label: string;
  col: number;
  row: number;
  x: number;
  y: number;
  displayWidthPx: number;
};

function structureAt(
  id: string,
  kind: EnglishCraftStructureKind,
  label: string,
  col: number,
  row: number,
  displayWidthPx: number,
  yOffset = 0.85,
  resourceType?: EnglishCraftResourceType,
): EnglishCraftStructureDef {
  return {
    id,
    kind,
    resourceType,
    label,
    col,
    row,
    x: grassTileColCenterPx(col),
    y: grassTileRowTopPx(row) + GRASS_TILE_SIZE_PX * yOffset,
    displayWidthPx,
  };
}

/** South shore storages, mid-map workbench, river bridge, north-east flag. */
export const ENGLISH_CRAFT_STRUCTURES_V1: EnglishCraftStructureDef[] = [
  structureAt("log-storage-01", "log_storage", "Wood pile", 2, 10, 84, 0.85, "wood"),
  structureAt("stone-storage-01", "stone_storage", "Stone shed", 6, 10, 84, 0.85, "stone"),
  structureAt("craft-bench-01", "workbench", "Crafting bench", 10, 8, 100),
  structureAt("wheat-storage-01", "wheat_storage", "Wheat barn", 14, 10, 84, 0.85, "wheat"),
  structureAt("dock-01", "dock", "Boat dock", 16, 10, 120, 0.82),
  structureAt("cotton-storage-01", "cotton_storage", "Cotton barn", 18, 10, 84, 0.85, "cotton"),
  {
    id: "bridge-01",
    kind: "bridge",
    label: "Bridge",
    col: 10,
    row: 5,
    x: (grassTileColCenterPx(10) + grassTileColCenterPx(11)) / 2,
    y: grassTileRowTopPx(5) + GRASS_TILE_SIZE_PX * 0.55,
    displayWidthPx: 176,
  },
  structureAt("flag-01", "flag", "Flag", 17, 2, 88, 0.88),
];

/** Bridge spans two tiles — block both for resource placement. */
const STRUCTURE_BLOCKED_CELLS = [
  ...ENGLISH_CRAFT_STRUCTURES_V1.map((structure) => ({ col: structure.col, row: structure.row })),
  { col: 11, row: 5 },
];

const AVAILABLE_RESOURCE_CELLS = listAvailableMapCells(buildBlockedMapCells(STRUCTURE_BLOCKED_CELLS));

const RESOURCE_LAYOUT: Array<{ prefix: string; type: EnglishCraftResourceType; label: string; count: number }> = [
  { prefix: "tree", type: "wood", label: "Oak tree", count: 8 },
  { prefix: "stone", type: "stone", label: "Stone", count: 4 },
  { prefix: "wheat", type: "wheat", label: "Wheat", count: 4 },
  { prefix: "cotton", type: "cotton", label: "Cotton", count: 4 },
];

function buildResourceNodes(): EnglishCraftResourceNodeDef[] {
  const total = RESOURCE_LAYOUT.reduce((sum, entry) => sum + entry.count, 0);
  const cells = pickSpreadCells(AVAILABLE_RESOURCE_CELLS, total);
  const nodes: EnglishCraftResourceNodeDef[] = [];
  let cellIndex = 0;

  for (const group of RESOURCE_LAYOUT) {
    for (let index = 0; index < group.count; index += 1) {
      const cell = cells[cellIndex];
      if (!cell) break;
      cellIndex += 1;
      const id = `${group.prefix}-${String(index + 1).padStart(2, "0")}`;
      nodes.push(resourceNodeAt(id, group.type, group.label, cell.col, cell.row));
    }
  }

  return nodes;
}

export const ENGLISH_CRAFT_RESOURCE_NODES_V1: EnglishCraftResourceNodeDef[] = buildResourceNodes();

export const ENGLISH_CRAFT_WOOD_TREES_V1 = ENGLISH_CRAFT_RESOURCE_NODES_V1.filter(
  (node) => node.resourceType === "wood",
);

export const ENGLISH_CRAFT_STONE_NODES_V1 = ENGLISH_CRAFT_RESOURCE_NODES_V1.filter(
  (node) => node.resourceType === "stone",
);

export const ENGLISH_CRAFT_WHEAT_NODES_V1 = ENGLISH_CRAFT_RESOURCE_NODES_V1.filter(
  (node) => node.resourceType === "wheat",
);

export const ENGLISH_CRAFT_COTTON_NODES_V1 = ENGLISH_CRAFT_RESOURCE_NODES_V1.filter(
  (node) => node.resourceType === "cotton",
);

export const ENGLISH_CRAFT_WOOD_TREE_BY_ID = Object.fromEntries(
  ENGLISH_CRAFT_WOOD_TREES_V1.map((tree) => [tree.id, tree]),
) as Record<string, EnglishCraftResourceNodeDef>;

export const ENGLISH_CRAFT_RESOURCE_NODE_BY_ID = Object.fromEntries(
  ENGLISH_CRAFT_RESOURCE_NODES_V1.map((node) => [node.id, node]),
) as Record<string, EnglishCraftResourceNodeDef>;

export const ENGLISH_CRAFT_STORAGE_BY_TYPE: Record<
  EnglishCraftResourceType,
  EnglishCraftStructureDef
> = {
  wood: ENGLISH_CRAFT_STRUCTURES_V1.find((s) => s.kind === "log_storage")!,
  stone: ENGLISH_CRAFT_STRUCTURES_V1.find((s) => s.kind === "stone_storage")!,
  wheat: ENGLISH_CRAFT_STRUCTURES_V1.find((s) => s.kind === "wheat_storage")!,
  cotton: ENGLISH_CRAFT_STRUCTURES_V1.find((s) => s.kind === "cotton_storage")!,
};

const flagStructure = ENGLISH_CRAFT_STRUCTURES_V1.find((structure) => structure.kind === "flag")!;

/** Touch zone for the team victory objective (overlap with player rect). */
export const ENGLISH_CRAFT_FLAG_ZONE_V1 = {
  id: flagStructure.id,
  label: flagStructure.label,
  x: flagStructure.x - ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX / 2,
  y: flagStructure.y - ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX,
  w: ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX,
  h: ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX,
};

const craftBenchStructure = ENGLISH_CRAFT_STRUCTURES_V1.find(
  (structure) => structure.id === ENGLISH_CRAFT_CRAFT_BENCH_ID,
)!;

/** Crafting bench interact point. */
export const ENGLISH_CRAFT_CRAFT_BENCH_V1 = {
  id: craftBenchStructure.id,
  label: craftBenchStructure.label,
  x: craftBenchStructure.x,
  y: craftBenchStructure.y,
  interactRadius: ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX,
};

const dockStructure = ENGLISH_CRAFT_STRUCTURES_V1.find((structure) => structure.kind === "dock")!;

export const ENGLISH_CRAFT_DOCK_V1 = {
  id: dockStructure.id,
  label: dockStructure.label,
  col: dockStructure.col,
  row: dockStructure.row,
  x: dockStructure.x,
  y: dockStructure.y,
  displayWidthPx: dockStructure.displayWidthPx,
};

const BOAT_BOARDING_ZONE_W = 120;
const BOAT_BOARDING_ZONE_H = 80;

/** Touch zone for team boat escape (overlap detection in Phase 4E). */
export const ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1 = {
  id: dockStructure.id,
  label: "Boat boarding zone",
  x: dockStructure.x - BOAT_BOARDING_ZONE_W / 2,
  y: dockStructure.y - BOAT_BOARDING_ZONE_H,
  w: BOAT_BOARDING_ZONE_W,
  h: BOAT_BOARDING_ZONE_H,
};

export function toStorageInteractTarget(storage: EnglishCraftStructureDef): InteractablePoint & {
  id: string;
  label: string;
} {
  return {
    id: storage.id,
    label: storage.label,
    x: storage.x,
    y: storage.y,
    interactRadius: ENGLISH_CRAFT_STORAGE_INTERACT_RADIUS_PX,
  };
}

export const ENGLISH_CRAFT_STORAGE_INTERACT_TARGETS_V1 = ENGLISH_CRAFT_STRUCTURES_V1.filter(
  (structure) => structure.kind.endsWith("_storage"),
).map(toStorageInteractTarget);

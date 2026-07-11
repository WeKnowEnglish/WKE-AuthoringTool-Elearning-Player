import {
  GRASS_TILE_SIZE_PX,
  grassTileColCenterPx,
  grassTileRowTopPx,
} from "@/lib/live-game/tiles/grass-tile-pack";
import {
  ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX,
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
  ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX,
  ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";

/** Grass tiles stack to rowIndex + 1 (max 11 on the pilot map). */
export const ENGLISH_CRAFT_OBJECTS_Z_BASE = 20;

export type EnglishCraftWoodTreeDef = {
  id: string;
  label: string;
  col: number;
  row: number;
  x: number;
  y: number;
  interactRadius: number;
};

function treeAt(id: string, label: string, col: number, row: number): EnglishCraftWoodTreeDef {
  return {
    id,
    label,
    col,
    row,
    x: grassTileColCenterPx(col),
    y: grassTileRowTopPx(row) + GRASS_TILE_SIZE_PX * 0.82,
    interactRadius: ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX,
  };
}

/** Eight wood trees in the south / mid map (cols 2–17, rows 7–9). */
export const ENGLISH_CRAFT_WOOD_TREES_V1: EnglishCraftWoodTreeDef[] = [
  treeAt("tree-01", "Oak tree", 3, 7),
  treeAt("tree-02", "Oak tree", 6, 7),
  treeAt("tree-03", "Oak tree", 9, 7),
  treeAt("tree-04", "Oak tree", 14, 7),
  treeAt("tree-05", "Oak tree", 3, 8),
  treeAt("tree-06", "Oak tree", 7, 8),
  treeAt("tree-07", "Oak tree", 11, 8),
  treeAt("tree-08", "Oak tree", 15, 9),
];

export const ENGLISH_CRAFT_WOOD_TREE_BY_ID = Object.fromEntries(
  ENGLISH_CRAFT_WOOD_TREES_V1.map((tree) => [tree.id, tree]),
) as Record<string, EnglishCraftWoodTreeDef>;

export type EnglishCraftStructureKind =
  | "workbench"
  | "bridge"
  | "flag"
  | "log_storage";

export type EnglishCraftStructureDef = {
  id: string;
  kind: EnglishCraftStructureKind;
  label: string;
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
): EnglishCraftStructureDef {
  return {
    id,
    kind,
    label,
    row,
    x: grassTileColCenterPx(col),
    y: grassTileRowTopPx(row) + GRASS_TILE_SIZE_PX * yOffset,
    displayWidthPx,
  };
}

/** Workbench, bridge crossing, flag objective, team log pile (north shore). */
export const ENGLISH_CRAFT_STRUCTURES_V1: EnglishCraftStructureDef[] = [
  structureAt("log-storage-01", "log_storage", "Wood pile", 9, 3, 84),
  structureAt("craft-bench-01", "workbench", "Crafting bench", 11, 3, 100),
  {
    id: "bridge-01",
    kind: "bridge",
    label: "Bridge",
    row: 5,
    x: (grassTileColCenterPx(10) + grassTileColCenterPx(11)) / 2,
    y: grassTileRowTopPx(5) + GRASS_TILE_SIZE_PX * 0.55,
    displayWidthPx: 176,
  },
  structureAt("flag-01", "flag", "Flag", 16, 2, 88, 0.88),
];

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

/** Crafting bench interact point (north shore). */
export const ENGLISH_CRAFT_CRAFT_BENCH_V1 = {
  id: craftBenchStructure.id,
  label: craftBenchStructure.label,
  x: craftBenchStructure.x,
  y: craftBenchStructure.y,
  interactRadius: ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX,
};


import type { BoardPathStyle } from "@/lib/board-game/types";
import { BOARD_LENGTHS } from "@/lib/board-game/constants";
import { readCustomMap } from "@/lib/board-game/map/library/storage";
import { generateBoardMap } from "@/lib/board-game/map/generate-map";
import { addShortcutToMap } from "@/lib/board-game/map/map-enrich";
import type { BoardMap, MapLayoutTemplate } from "@/lib/board-game/map/types";

/** Built-in maps shipped with the app. */
export const DEFAULT_MAPS: Record<string, BoardMap> = {};

export type MapPresetCatalogEntry = {
  id: string;
  label: string;
  description: string;
  /** Legacy fallback when mapId is absent from stored setup. */
  boardPathStyle: BoardPathStyle;
};

export const MAP_PRESET_CATALOG: MapPresetCatalogEntry[] = [
  { id: "default-short", label: "Short Trail", description: "12 spaces · Snake · Classroom", boardPathStyle: "short" },
  { id: "default-medium", label: "Jungle Spiral", description: "20 spaces · Spiral · Jungle", boardPathStyle: "medium" },
  { id: "default-long", label: "Ocean Island", description: "30 spaces · Island · Ocean", boardPathStyle: "long" },
  { id: "default-epic", label: "Castle Epic", description: "40 spaces · Snake · Castle", boardPathStyle: "long" },
  { id: "default-marathon", label: "Space Marathon", description: "60 spaces · Spiral · Space", boardPathStyle: "long" },
  { id: "default-legend", label: "Legend Island", description: "80 spaces · Island · Jungle", boardPathStyle: "long" },
];

function registerDefault(map: BoardMap): void {
  DEFAULT_MAPS[map.id] = map;
}

const PATH_STYLE_LAYOUT: Record<BoardPathStyle, MapLayoutTemplate> = {
  short: "snake",
  medium: "spiral",
  long: "island",
};

const PATH_STYLE_THEME: Record<BoardPathStyle, BoardMap["theme"]> = {
  short: "classroom",
  medium: "jungle",
  long: "ocean",
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildGeneratedMap(options: {
  id: string;
  title: string;
  theme: BoardMap["theme"];
  layoutTemplate: MapLayoutTemplate;
  boardLength: number;
  seed: number;
}): BoardMap {
  return generateBoardMap({
    id: options.id,
    title: options.title,
    theme: options.theme,
    layoutTemplate: options.layoutTemplate,
    boardLength: options.boardLength,
    random: seededRandom(options.seed),
  });
}

function buildPathStyleDefault(style: BoardPathStyle): BoardMap {
  const boardLength = BOARD_LENGTHS[style];
  return buildGeneratedMap({
    id: `default-${style}`,
    title: `${style.charAt(0).toUpperCase()}${style.slice(1)} Adventure`,
    theme: PATH_STYLE_THEME[style],
    layoutTemplate: PATH_STYLE_LAYOUT[style],
    boardLength,
    seed: boardLength * 997,
  });
}

for (const style of ["short", "medium", "long"] as BoardPathStyle[]) {
  registerDefault(buildPathStyleDefault(style));
}

registerDefault(
  buildGeneratedMap({
    id: "default-epic",
    title: "Castle Epic",
    theme: "castle",
    layoutTemplate: "snake",
    boardLength: 40,
    seed: 4001,
  }),
);

registerDefault(
  buildGeneratedMap({
    id: "default-marathon",
    title: "Space Marathon",
    theme: "space",
    layoutTemplate: "spiral",
    boardLength: 60,
    seed: 6001,
  }),
);

let legendMap = buildGeneratedMap({
  id: "default-legend",
  title: "Legend Island",
  theme: "jungle",
  layoutTemplate: "island",
  boardLength: 80,
  seed: 8001,
});
legendMap = addShortcutToMap(legendMap, 12, 28, "bridge");
legendMap = addShortcutToMap(legendMap, 35, 50, "tunnel");
registerDefault(legendMap);

let longMap = DEFAULT_MAPS["default-long"]!;
longMap = addShortcutToMap(longMap, 8, 18, "bridge");
registerDefault(longMap);

registerDefault(
  buildGeneratedMap({
    id: "template-snake-20",
    title: "Snake Trail",
    theme: "classroom",
    layoutTemplate: "snake",
    boardLength: 20,
    seed: 20,
  }),
);

let island20 = buildGeneratedMap({
  id: "template-island-20",
  title: "Island Adventure",
  theme: "jungle",
  layoutTemplate: "island",
  boardLength: 20,
  seed: 77,
});
island20 = addShortcutToMap(island20, 6, 14, "shortcut");
registerDefault(island20);

registerDefault(
  buildGeneratedMap({
    id: "template-spiral-20",
    title: "Spiral Quest",
    theme: "space",
    layoutTemplate: "spiral",
    boardLength: 20,
    seed: 42,
  }),
);

export function getDefaultMapForPathStyle(style: BoardPathStyle): BoardMap {
  return DEFAULT_MAPS[`default-${style}`] ?? buildPathStyleDefault(style);
}

export function getBuiltInMapById(mapId: string): BoardMap | null {
  return DEFAULT_MAPS[mapId] ?? null;
}

export function getMapById(mapId: string): BoardMap | null {
  const builtIn = getBuiltInMapById(mapId);
  if (builtIn) return builtIn;
  return readCustomMap(mapId)?.map ?? null;
}

export function listDefaultMaps(): BoardMap[] {
  return Object.values(DEFAULT_MAPS);
}

export function getPresetById(mapId: string): MapPresetCatalogEntry | null {
  return MAP_PRESET_CATALOG.find((entry) => entry.id === mapId) ?? null;
}

export function defaultMapIdForPathStyle(style: BoardPathStyle): string {
  return `default-${style}`;
}

import { generateBoardMap, pathIndexFromSpaceId, spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import { addShortcutToMap } from "@/lib/board-game/map/map-enrich";
import { defaultEffectsForSpaceType, defaultIconForSpaceType } from "@/lib/board-game/map/library/builder-defaults";
import { createCustomMapId } from "@/lib/board-game/map/library/storage";
import type { BoardConnection, BoardMap, BoardMapSpace, MapLayoutTemplate, MapThemeId } from "@/lib/board-game/map/types";

export type CreateMapFromOptionsInput = {
  title: string;
  theme: MapThemeId;
  layoutTemplate: MapLayoutTemplate;
  boardLength: number;
  id?: string;
};

export function createMapFromOptions(input: CreateMapFromOptionsInput): BoardMap {
  const id = input.id ?? createCustomMapId();
  return generateBoardMap({
    id,
    title: input.title.trim() || "Untitled Map",
    theme: input.theme,
    layoutTemplate: input.layoutTemplate,
    boardLength: input.boardLength,
  });
}

export function cloneMapAsCustom(source: BoardMap, title: string, id?: string): BoardMap {
  const nextId = id ?? createCustomMapId();
  return enrichMapClone({
    ...structuredClone(source),
    id: nextId,
    title: title.trim() || source.title,
  });
}

function enrichMapClone(map: BoardMap): BoardMap {
  return {
    ...map,
    spaces: map.spaces.map((space) => ({ ...space })),
    connections: map.connections.map((connection) => ({ ...connection })),
    pathOrder: [...map.pathOrder],
    pathTileOverrides: map.pathTileOverrides ? { ...map.pathTileOverrides } : undefined,
    terrainTileOverrides: map.terrainTileOverrides ? { ...map.terrainTileOverrides } : undefined,
  };
}

export type SpacePatch = Partial<
  Pick<BoardMapSpace, "label" | "type" | "icon" | "effects" | "effect" | "kind" | "questionCategory">
>;

export function updateSpace(map: BoardMap, spaceId: number, patch: SpacePatch): BoardMap {
  const pathIndex = pathIndexFromSpaceId(map, spaceId);
  const boardLength = map.pathOrder.length - 1;
  if (pathIndex === 0 || pathIndex === boardLength) {
    return map;
  }

  const spaces = map.spaces.map((space) => {
    if (space.id !== spaceId) return space;

    const nextType = patch.type ?? space.type;
    const typeDefaults = patch.type ? defaultEffectsForSpaceType(nextType) : undefined;
    const typeIcon = patch.type ? defaultIconForSpaceType(nextType) : undefined;

    return {
      ...space,
      ...patch,
      type: nextType,
      effects: patch.effects ?? (patch.type ? typeDefaults : space.effects),
      icon: patch.icon ?? (patch.type ? typeIcon : space.icon),
    };
  });

  return { ...map, spaces };
}

export function updateMapMeta(
  map: BoardMap,
  patch: Partial<Pick<BoardMap, "title" | "theme" | "pathTerrainDecoration">>,
): BoardMap {
  return {
    ...map,
    ...patch,
    title: patch.title?.trim() || map.title,
  };
}

export function addConnectionByPathIndex(
  map: BoardMap,
  fromPathIndex: number,
  toPathIndex: number,
  connectionType: BoardConnection["type"] = "bridge",
): BoardMap {
  if (fromPathIndex >= toPathIndex) {
    throw new Error("Shortcut must jump forward along the path.");
  }
  return addShortcutToMap(map, fromPathIndex, toPathIndex, connectionType);
}

export function removeConnection(map: BoardMap, fromSpaceId: number): BoardMap {
  const connections = map.connections.filter((entry) => entry.from !== fromSpaceId);
  const spaces = map.spaces.map((space) => {
    if (space.id === fromSpaceId && space.type === "shortcutStart") {
      return { ...space, type: "question" as const };
    }
    return space;
  });
  return { ...map, connections, spaces };
}

export function listConnectionOptions(map: BoardMap, fromSpaceId: number): { pathIndex: number; label: string; spaceId: number }[] {
  const fromPathIndex = pathIndexFromSpaceId(map, fromSpaceId);
  if (fromPathIndex < 0) return [];

  const boardLength = map.pathOrder.length - 1;
  const options: { pathIndex: number; label: string; spaceId: number }[] = [];

  for (let pathIndex = fromPathIndex + 1; pathIndex <= boardLength; pathIndex++) {
    const space = spaceAtPathIndex(map, pathIndex);
    if (!space) continue;
    options.push({
      pathIndex,
      spaceId: space.id,
      label: pathIndex === boardLength ? "Finish" : space.label || `Space ${pathIndex}`,
    });
  }

  return options;
}

export function mapSnapshot(map: BoardMap): string {
  return JSON.stringify(map);
}

export function isMapDirty(map: BoardMap, savedSnapshot: string | null): boolean {
  if (!savedSnapshot) return true;
  return mapSnapshot(map) !== savedSnapshot;
}

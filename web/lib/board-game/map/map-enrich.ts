import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import type { BoardConnection, BoardMap } from "@/lib/board-game/map/types";

/** Add a shortcut connection between two path indices (mutates and returns map). */
export function addShortcutToMap(
  map: BoardMap,
  fromPathIndex: number,
  toPathIndex: number,
  connectionType: BoardConnection["type"] = "bridge",
): BoardMap {
  const fromId = map.pathOrder[fromPathIndex];
  const toId = map.pathOrder[toPathIndex];
  if (fromId === undefined || toId === undefined) return map;

  const fromSpace = spaceAtPathIndex(map, fromPathIndex);
  const toSpace = spaceAtPathIndex(map, toPathIndex);

  const spaces = map.spaces.map((space) => {
    if (space.id === fromId) {
      return { ...space, type: "shortcutStart" as const, label: space.label || "Shortcut" };
    }
    if (space.id === toId) {
      return { ...space, type: "shortcutEnd" as const };
    }
    return space;
  });

  const connections = [
    ...map.connections.filter((entry) => entry.from !== fromId),
    { from: fromId, to: toId, type: connectionType },
  ];

  return { ...map, spaces, connections };
}

export function enrichMapEffects(map: BoardMap): BoardMap {
  const boardLength = map.pathOrder.length - 1;
  const spaces = map.spaces.map((space) => {
    const pathIndex = map.pathOrder.indexOf(space.id);
    const effects = { ...space.effects };

    if (space.effect && !effects.onLand) {
      effects.onLand = space.effect;
    }

    if (pathIndex > 0 && pathIndex < boardLength && pathIndex % 7 === 0 && !effects.onWrong && effects.wrongPoints === undefined) {
      effects.onWrong = "moveBack2";
    }

    return Object.keys(effects).length > 0 ? { ...space, effects } : space;
  });

  return { ...map, spaces };
}

export function finalizeGeneratedMap(map: BoardMap): BoardMap {
  return enrichMapEffects(map);
}

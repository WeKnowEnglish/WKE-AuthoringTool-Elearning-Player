import { getSpaceAt } from "@/lib/board-game/board-spaces";
import type { BoardSpaceMeta, SpaceEffectType, SpaceKind } from "@/lib/board-game/types";
import { spaceAtPathIndex } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";

/** Finish path index (same semantics as legacy boardLength). */
export function boardLengthFromMap(map: BoardMap): number {
  return map.pathOrder.length - 1;
}

/**
 * Convert map special squares into runtime BoardSpaceMeta entries keyed by path index.
 * Replaces procedural generateBoardSpaces for map-driven games.
 */
export function mapToRuntimeSpaces(map: BoardMap): BoardSpaceMeta[] {
  const boardLength = boardLengthFromMap(map);
  const spaces: BoardSpaceMeta[] = [];

  for (let pathIndex = 2; pathIndex < boardLength; pathIndex++) {
    const space = spaceAtPathIndex(map, pathIndex);
    if (!space?.kind || space.kind === "normal" || !space.effect) continue;

    spaces.push({
      index: pathIndex,
      kind: space.kind as SpaceKind,
      effect: space.effect as SpaceEffectType,
      label: space.label,
      emoji: space.icon ?? "✨",
    });
  }

  return spaces.sort((a, b) => a.index - b.index);
}

/** Lookup runtime lucky-space meta at a path index (for migration / tests). */
export function getRuntimeSpaceAt(
  map: BoardMap,
  runtimeSpaces: BoardSpaceMeta[],
  pathIndex: number,
): BoardSpaceMeta | null {
  return getSpaceAt(runtimeSpaces, pathIndex) ?? runtimeSpaceFromMap(map, pathIndex);
}

function runtimeSpaceFromMap(map: BoardMap, pathIndex: number): BoardSpaceMeta | null {
  const space = spaceAtPathIndex(map, pathIndex);
  if (!space?.kind || space.kind === "normal" || !space.effect) return null;
  return {
    index: pathIndex,
    kind: space.kind as SpaceKind,
    effect: space.effect as SpaceEffectType,
    label: space.label,
    emoji: space.icon ?? "✨",
  };
}

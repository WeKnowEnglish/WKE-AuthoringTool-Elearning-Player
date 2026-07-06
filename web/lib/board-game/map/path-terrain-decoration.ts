import type { BoardMap, PathTerrainDecoration } from "@/lib/board-game/map/types";

export function pathTerrainDecorationForMap(map: BoardMap): PathTerrainDecoration {
  return map.pathTerrainDecoration ?? "endpoints-only";
}

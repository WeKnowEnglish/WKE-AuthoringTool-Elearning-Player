import { islandGridForPathIndex } from "@/lib/board-game/map/layouts/island";
import { spiralGridForPathIndex } from "@/lib/board-game/map/layouts/spiral";
import { snakeColumnsForLength, snakeGridForPathIndex } from "@/lib/board-game/map/layouts/snake";
import type { MapLayoutTemplate } from "@/lib/board-game/map/types";

export function gridForPathIndex(
  template: MapLayoutTemplate,
  pathIndex: number,
  pathLength: number,
): { col: number; row: number } {
  switch (template) {
    case "spiral":
      return spiralGridForPathIndex(pathIndex, pathLength);
    case "island":
      return islandGridForPathIndex(pathIndex, pathLength);
    case "snake":
    default:
      return snakeGridForPathIndex(pathIndex, snakeColumnsForLength(pathLength));
  }
}

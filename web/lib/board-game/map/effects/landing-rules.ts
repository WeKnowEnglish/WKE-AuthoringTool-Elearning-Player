import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";

const MOVEMENT_ONLY_TYPES = new Set<BoardMapSpace["type"]>([
  "start",
  "finish",
  "bonus",
  "penalty",
  "moveForward",
  "moveBackward",
  "skipTurn",
  "rollAgain",
  "shortcutStart",
  "shortcutEnd",
]);

/** Whether landing on this square should open a question modal. */
export function shouldAskQuestion(space: BoardMapSpace | null, pathIndex: number, boardLength: number): boolean {
  if (!space) return pathIndex > 0 && pathIndex < boardLength;
  if (pathIndex === 0 || pathIndex === boardLength) return false;
  if (space.type === "question" || space.type === "normal") return true;
  if (MOVEMENT_ONLY_TYPES.has(space.type)) {
    const hasOnlyLandEffect =
      space.effects?.onLand !== undefined ||
      space.effect !== undefined ||
      space.type === "bonus" ||
      space.type === "penalty" ||
      space.type === "moveForward" ||
      space.type === "moveBackward" ||
      space.type === "skipTurn" ||
      space.type === "rollAgain";
    return !hasOnlyLandEffect;
  }
  return true;
}

/** True when the square has a land effect worth showing / applying. */
export function hasLandEffect(space: BoardMapSpace | null): boolean {
  if (!space) return false;
  if (space.effects?.onLand || space.effect) return true;
  return (
    space.type === "bonus" ||
    space.type === "penalty" ||
    space.type === "moveForward" ||
    space.type === "moveBackward" ||
    space.type === "skipTurn" ||
    space.type === "rollAgain"
  );
}

export function boardLengthFromMapRef(map: BoardMap): number {
  return map.pathOrder.length - 1;
}

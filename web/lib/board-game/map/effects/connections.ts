import { pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import type { BoardConnection, BoardMap } from "@/lib/board-game/map/types";

export function resolveConnectionOnLand(
  map: BoardMap,
  pathIndex: number,
): { connection: BoardConnection; destinationPathIndex: number } | null {
  const spaceId = map.pathOrder[pathIndex];
  if (spaceId === undefined) return null;

  const connection = map.connections.find((entry) => entry.from === spaceId);
  if (!connection) return null;

  const destinationPathIndex = pathIndexFromSpaceId(map, connection.to);
  if (destinationPathIndex < 0) return null;

  return { connection, destinationPathIndex };
}

export function connectionLabel(map: BoardMap, destinationPathIndex: number): string {
  const space = map.spaces.find((entry) => entry.id === map.pathOrder[destinationPathIndex]);
  if (!space) return `space ${destinationPathIndex}`;
  if (destinationPathIndex === map.pathOrder.length - 1) return "Finish";
  if (destinationPathIndex === 0) return "Start";
  return space.label || String(destinationPathIndex);
}

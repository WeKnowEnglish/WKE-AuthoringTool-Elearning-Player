export const BOARD_GAME_ROOM_PREFIX = "wke-board-game-";
export const LIVE_GAME_ROOM_PREFIX = "wke-live-game-";

export type LiveblocksRoomProduct = "board-game" | "live-game" | "unknown";

export function getRoomProduct(room: string): LiveblocksRoomProduct {
  if (room.startsWith(BOARD_GAME_ROOM_PREFIX)) return "board-game";
  if (room.startsWith(LIVE_GAME_ROOM_PREFIX)) return "live-game";
  return "unknown";
}

export function sessionIdFromPrefixedRoom(
  room: string,
  prefix: string,
): string | null {
  if (!room.startsWith(prefix)) return null;
  return room.slice(prefix.length) || null;
}

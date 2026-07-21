export const BOARD_GAME_ROOM_PREFIX = "wke-board-game-";
export const LIVE_GAME_ROOM_PREFIX = "wke-live-game-";
export const WHITEBOARD_ROOM_PREFIX = "wke-whiteboard-";
export const VIRTUAL_CLASSROOM_ROOM_PREFIX = "wke-vc-session-";
export {
  DOCUMENT_ROOM_PREFIX,
  WORD_CARDS_ROOM_PREFIX,
} from "@/lib/activity-runtime/activity-types";

export type LiveblocksRoomProduct =
  | "board-game"
  | "live-game"
  | "whiteboard"
  | "virtual-classroom"
  | "document"
  | "word-cards"
  | "unknown";

export function getRoomProduct(room: string): LiveblocksRoomProduct {
  if (room.startsWith(BOARD_GAME_ROOM_PREFIX)) return "board-game";
  if (room.startsWith(LIVE_GAME_ROOM_PREFIX)) return "live-game";
  // VC prefix before whiteboard: both start with wke- but are distinct.
  if (room.startsWith(VIRTUAL_CLASSROOM_ROOM_PREFIX)) return "virtual-classroom";
  if (room.startsWith(WHITEBOARD_ROOM_PREFIX)) return "whiteboard";
  if (room.startsWith("wke-doc-")) return "document";
  if (room.startsWith("wke-word-cards-")) return "word-cards";
  return "unknown";
}

export function sessionIdFromPrefixedRoom(
  room: string,
  prefix: string,
): string | null {
  if (!room.startsWith(prefix)) return null;
  return room.slice(prefix.length) || null;
}

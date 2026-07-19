import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { WHITEBOARD_ROOM_PREFIX } from "@/lib/liveblocks/room-prefix";

export function toWhiteboardRoomId(sessionId: string): string {
  return `${WHITEBOARD_ROOM_PREFIX}${sessionId}`;
}

/**
 * Resolve join-code session id from any whiteboard room variant:
 * - wke-whiteboard-{JOINCODE}
 * - wke-whiteboard-ctrl-{JOINCODE}-{roundShort}
 * - wke-whiteboard-board-{JOINCODE}-…
 */
export function sessionIdFromWhiteboardRoom(room: string): string | null {
  if (!room.startsWith(WHITEBOARD_ROOM_PREFIX)) return null;
  const rest = room.slice(WHITEBOARD_ROOM_PREFIX.length);

  if (rest.startsWith("ctrl-")) {
    const after = rest.slice("ctrl-".length);
    const sessionId = after.split("-")[0] ?? "";
    return isValidJoinCode(sessionId) ? sessionId : null;
  }

  if (rest.startsWith("board-")) {
    const after = rest.slice("board-".length);
    const sessionId = after.split("-")[0] ?? "";
    return isValidJoinCode(sessionId) ? sessionId : null;
  }

  return isValidJoinCode(rest) ? rest : null;
}

export function isWhiteboardControlRoom(room: string): boolean {
  return room.startsWith(`${WHITEBOARD_ROOM_PREFIX}ctrl-`);
}

export function isWhiteboardBoardRoom(room: string): boolean {
  return room.startsWith(`${WHITEBOARD_ROOM_PREFIX}board-`);
}

import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";

export const ROOM_PREFIX = "wke-board-game-";

export function toRoomId(sessionId: string): string {
  return `${ROOM_PREFIX}${sessionId}`;
}

export function sessionIdFromRoomId(room: string): string | null {
  if (!room.startsWith(ROOM_PREFIX)) return null;
  const sessionId = room.slice(ROOM_PREFIX.length);
  return isValidJoinCode(sessionId) ? sessionId : null;
}

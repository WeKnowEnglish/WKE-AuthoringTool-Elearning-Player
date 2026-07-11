import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { LIVE_GAME_ROOM_PREFIX } from "@/lib/liveblocks/room-prefix";

export { LIVE_GAME_ROOM_PREFIX as ROOM_PREFIX };

export function toRoomId(sessionId: string): string {
  return `${LIVE_GAME_ROOM_PREFIX}${sessionId}`;
}

export function sessionIdFromRoomId(room: string): string | null {
  if (!room.startsWith(LIVE_GAME_ROOM_PREFIX)) return null;
  const sessionId = room.slice(LIVE_GAME_ROOM_PREFIX.length);
  return isValidJoinCode(sessionId) ? sessionId : null;
}

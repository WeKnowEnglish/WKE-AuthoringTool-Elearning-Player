import { hostCookieMatchesSession } from "@/lib/board-game/liveblocks/host-cookie";
import { sessionIdFromRoomId } from "@/lib/board-game/liveblocks/room-id";

export type LiveblocksAuthRole = "host" | "player";

export function canAccessRoom(input: {
  room: string;
  role: LiveblocksAuthRole;
  hostCookie: string | null;
}): boolean {
  const sessionId = sessionIdFromRoomId(input.room);
  if (!sessionId) return false;

  if (input.role === "host") {
    return hostCookieMatchesSession(input.hostCookie, sessionId);
  }

  return true;
}

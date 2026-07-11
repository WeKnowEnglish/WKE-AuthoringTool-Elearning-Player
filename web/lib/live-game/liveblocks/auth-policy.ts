import { hostCookieMatchesSession } from "@/lib/live-game/liveblocks/host-cookie";
import { sessionIdFromRoomId } from "@/lib/live-game/liveblocks/room-id";

export type LiveGameAuthRole = "host" | "player";

export function canAccessLiveGameRoom(input: {
  room: string;
  role: LiveGameAuthRole;
  hostCookie: string | null;
}): boolean {
  const sessionId = sessionIdFromRoomId(input.room);
  if (!sessionId) return false;

  if (input.role === "host") {
    return hostCookieMatchesSession(input.hostCookie, sessionId);
  }

  return true;
}

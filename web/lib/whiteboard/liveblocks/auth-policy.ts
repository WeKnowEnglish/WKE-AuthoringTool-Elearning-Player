import { sessionIdFromWhiteboardRoom } from "@/lib/whiteboard/liveblocks/room-id";
import {
  decodeWhiteboardPlayerToken,
  whiteboardHostMatchesSession,
} from "@/lib/whiteboard/liveblocks/host-cookie";

export function canAccessWhiteboardRoom(input: {
  room: string;
  role: "host" | "player";
  hostCookie: string | null;
  playerCookie: string | null;
}): boolean {
  const sessionId = sessionIdFromWhiteboardRoom(input.room);
  if (!sessionId) return false;

  const player = decodeWhiteboardPlayerToken(input.playerCookie);
  if (player?.sessionId === sessionId) {
    // Fan-out: same session cookie authorizes control + board rooms.
    return true;
  }

  if (input.role === "host") {
    return whiteboardHostMatchesSession(input.hostCookie, sessionId);
  }

  return false;
}

import { createHash } from "node:crypto";

/**
 * Opaque Daily room name from internal session id — no class/child names.
 * Daily names: letters, numbers, dashes; keep length bounded.
 */
export function opaqueDailyRoomName(sessionId: string): string {
  const digest = createHash("sha256")
    .update(`wke-daily-room:${sessionId.trim()}`)
    .digest("hex")
    .slice(0, 24);
  return `wke-d-${digest}`;
}

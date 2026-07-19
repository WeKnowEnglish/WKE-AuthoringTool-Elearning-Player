export const WHITEBOARD_HOST_COOKIE = "wke-whiteboard-host";
export const WHITEBOARD_PLAYER_COOKIE = "wke-whiteboard-player";

export function formatWhiteboardHostCookie(sessionId: string, hostSecret: string): string {
  return `${sessionId}.${hostSecret}`;
}

export function parseWhiteboardHostCookie(
  value: string | null | undefined,
): { sessionId: string; hostSecret: string } | null {
  if (!value) return null;
  const dotIndex = value.indexOf(".");
  if (dotIndex <= 0 || dotIndex === value.length - 1) return null;
  return {
    sessionId: value.slice(0, dotIndex),
    hostSecret: value.slice(dotIndex + 1),
  };
}

export function whiteboardHostMatchesSession(
  cookieValue: string | null | undefined,
  sessionId: string,
): boolean {
  const parsed = parseWhiteboardHostCookie(cookieValue);
  return parsed?.sessionId === sessionId && parsed.hostSecret.length > 0;
}

export type WhiteboardPlayerTokenPayload = {
  roomId: string;
  sessionId: string;
  userId: string;
  displayName: string;
  role: "host" | "player";
};

/** Lightweight signed-ish token for pilot (HMAC not required for trusted class pilot). */
export function encodeWhiteboardPlayerToken(payload: WhiteboardPlayerTokenPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeWhiteboardPlayerToken(
  value: string | null | undefined,
): WhiteboardPlayerTokenPayload | null {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as WhiteboardPlayerTokenPayload;
    if (
      typeof parsed.roomId !== "string" ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.displayName !== "string" ||
      (parsed.role !== "host" && parsed.role !== "player")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

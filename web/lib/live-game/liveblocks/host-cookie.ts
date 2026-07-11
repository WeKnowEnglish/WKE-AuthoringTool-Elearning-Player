export const LIVE_GAME_HOST_COOKIE_NAME = "wke-live-game-host";

export function formatHostCookieValue(sessionId: string, hostSecret: string): string {
  return `${sessionId}.${hostSecret}`;
}

export function parseHostCookieValue(
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

export function hostCookieMatchesSession(
  cookieValue: string | null | undefined,
  sessionId: string,
): boolean {
  const parsed = parseHostCookieValue(cookieValue);
  return parsed?.sessionId === sessionId && parsed.hostSecret.length > 0;
}

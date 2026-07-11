export const IDLE_LOGOUT_MS = 10 * 60 * 1000;

export function isIdleSessionExpired(
  lastActivityAt: number,
  now: number,
  timeoutMs = IDLE_LOGOUT_MS,
): boolean {
  return now - lastActivityAt >= timeoutMs;
}

export function remainingIdleSessionMs(
  lastActivityAt: number,
  now: number,
  timeoutMs = IDLE_LOGOUT_MS,
): number {
  return Math.max(0, timeoutMs - (now - lastActivityAt));
}

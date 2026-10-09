/** Refresh recovery stores intent and mute choices, never a meeting token. */
export type DailyResume = { joinedAt: number; audioOff: boolean; videoOff: boolean };
const RESUME_TTL_MS = 8 * 60 * 60 * 1000;
export const DAILY_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 20_000];

export function dailyResumeKey(sessionId: string, userId: string) {
  return `wke-daily-resume:${sessionId}:${userId}`;
}

export function parseDailyResume(raw: string | null, now = Date.now()): DailyResume | null {
  try {
    const value = JSON.parse(raw ?? "null") as DailyResume | null;
    return value && Number.isFinite(value.joinedAt) && value.joinedAt <= now &&
      now - value.joinedAt < RESUME_TTL_MS && typeof value.audioOff === "boolean" &&
      typeof value.videoOff === "boolean" ? value : null;
  } catch { return null; }
}

export function canRetryDailyRequest(status: number, code?: string) {
  if (["daily_disabled", "daily_not_configured", "session_ended", "room_expired", "not_authorized", "not_host", "not_enrolled"].includes(code ?? "")) return false;
  return status === 0 || status === 408 || status === 429 || status >= 500 ||
    (status === 404 && code === "room_missing");
}

/** Only a network failure or expired join credential is eligible for fresh entry. */
export function canRecoverDailyFatalError(type?: string) {
  return type === "connection-error" || type === "exp-token";
}

export type SessionTimerAlertPhase = "none" | "two_min" | "thirty_sec" | "final_five";

export function isUnlimitedSessionTimer(endsAt: number | null): boolean {
  return endsAt == null;
}

export function computeSessionRemainingMs(endsAt: number | null, now: number): number | null {
  if (endsAt == null) return null;
  return Math.max(0, endsAt - now);
}

export function getSessionRemainingSecondsFloor(remainingMs: number): number {
  return Math.max(0, Math.floor(remainingMs / 1000));
}

export function getSessionRemainingSecondsCeil(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function formatSessionTimeRemaining(remainingMs: number): string {
  const totalSec = getSessionRemainingSecondsCeil(remainingMs);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getSessionTimerAlertPhase(remainingSecFloor: number): SessionTimerAlertPhase {
  if (remainingSecFloor <= 0) return "none";
  if (remainingSecFloor <= 5) return "final_five";
  if (remainingSecFloor <= 30) return "thirty_sec";
  if (remainingSecFloor <= 120) return "two_min";
  return "none";
}

export function getFinalCountdownDigit(remainingMs: number): number | null {
  const digit = getSessionRemainingSecondsCeil(remainingMs);
  if (digit <= 0 || digit > 5) return null;
  return digit;
}

export type SessionTimerFlashKind = "two_min" | "thirty_sec";

export function detectSessionTimerFlashCrossing(
  previousSecFloor: number | null,
  currentSecFloor: number,
): SessionTimerFlashKind | null {
  if (previousSecFloor == null) return null;
  if (previousSecFloor > 120 && currentSecFloor <= 120) return "two_min";
  if (previousSecFloor > 30 && currentSecFloor <= 30) return "thirty_sec";
  return null;
}

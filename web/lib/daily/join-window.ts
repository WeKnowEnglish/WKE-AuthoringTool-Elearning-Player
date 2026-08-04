/** Join / token lifetime rules for Daily ↔ Virtual Classroom (Phase 1). */

/** Default private room lifetime from creation when no schedule bind exists. */
export const DAILY_ROOM_TTL_MS = 4 * 60 * 60 * 1000;

/** Meeting token lifetime (capped by room expiry). */
export const DAILY_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/** Grace after room expiry before refusing new tokens. */
export const DAILY_TOKEN_GRACE_MS = 10 * 60 * 1000;

export type SessionJoinability = {
  ok: true;
} | {
  ok: false;
  code:
    | "session_ended"
    | "session_not_active"
    | "room_expired"
    | "too_early";
  message: string;
};

export function computeDailyRoomExpiresAt(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + DAILY_ROOM_TTL_MS);
}

export function computeMeetingTokenExpUnix(input: {
  nowMs?: number;
  roomExpiresAt: Date | string | null;
}): number {
  const now = input.nowMs ?? Date.now();
  const tokenCap = now + DAILY_TOKEN_TTL_MS;
  if (!input.roomExpiresAt) {
    return Math.floor(tokenCap / 1000);
  }
  const roomEnd =
    typeof input.roomExpiresAt === "string"
      ? new Date(input.roomExpiresAt).getTime()
      : input.roomExpiresAt.getTime();
  const withGrace = roomEnd + DAILY_TOKEN_GRACE_MS;
  return Math.floor(Math.min(tokenCap, withGrace) / 1000);
}

/**
 * Phase 1: ad-hoc VC sessions are joinable while status is active and room not past grace.
 * Calendar-tied early-join windows land when sessions bind to schedule (Phase 2+).
 */
export function evaluateSessionJoinability(input: {
  status: string;
  roomExpiresAt?: string | null;
  nowMs?: number;
}): SessionJoinability {
  const now = input.nowMs ?? Date.now();
  if (input.status === "ended") {
    return {
      ok: false,
      code: "session_ended",
      message: "This Virtual Classroom session has ended.",
    };
  }
  if (input.status !== "active") {
    return {
      ok: false,
      code: "session_not_active",
      message: "This session is not open for video yet.",
    };
  }
  if (input.roomExpiresAt) {
    const expires = new Date(input.roomExpiresAt).getTime();
    if (Number.isFinite(expires) && now > expires + DAILY_TOKEN_GRACE_MS) {
      return {
        ok: false,
        code: "room_expired",
        message: "The video room for this session has expired.",
      };
    }
  }
  return { ok: true };
}

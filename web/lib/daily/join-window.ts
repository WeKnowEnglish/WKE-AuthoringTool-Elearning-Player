/** Join / token lifetime rules for Daily ↔ Virtual Classroom (Phase 2 hardened). */

import {
  CLASS_LIVE_OPEN_MS,
  CLASS_TEACHER_EARLY_MS,
} from "@/lib/class-schedule/class-clock";

/** Default private room lifetime from creation when no nearby schedule bind exists. */
export const DAILY_ROOM_TTL_MS = 4 * 60 * 60 * 1000;

/** Meeting token lifetime (capped by room expiry). */
export const DAILY_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Soft grace after room expiry while session is still active.
 * Phase 2b: tightened from 10m → 5m.
 */
export const DAILY_TOKEN_GRACE_MS = 5 * 60 * 1000;

/** Teachers may connect video this early relative to the scheduled start (prep / waiting). */
export const TEACHER_EARLY_JOIN_MS = CLASS_TEACHER_EARLY_MS;

/** Students/guests may connect video from live open (T−5), not waiting lobby. */
export const STUDENT_EARLY_JOIN_MS = CLASS_LIVE_OPEN_MS;

/** Keep the Daily room alive after scheduled class end. */
export const POST_CLASS_ROOM_GRACE_MS = 15 * 60 * 1000;

/** Only bind schedule rules when a live slot is within this lookahead. */
export const SCHEDULE_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

/** Absolute ceiling for schedule-bound room life from "now" (lookahead + class + buffer). */
export const SCHEDULE_ROOM_HARD_CAP_MS =
  SCHEDULE_LOOKAHEAD_MS + 4 * 60 * 60 * 1000 + POST_CLASS_ROOM_GRACE_MS;

export type DailyJoinRole = "teacher" | "student" | "guest";

export type SessionJoinability =
  | { ok: true }
  | {
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

/**
 * Schedule-bound room end: class end + post grace.
 * Does NOT cap at create+4h (that killed rooms opened early for afternoon classes).
 * Floors at create+1h; ceilings at now + hard cap.
 */
export function computeScheduledDailyRoomExpiresAt(input: {
  createdAt?: Date;
  scheduledEndsAt: Date;
  nowMs?: number;
}): Date {
  const now = input.nowMs ?? Date.now();
  const createdAt = input.createdAt ?? new Date(now);
  const scheduleEnd =
    input.scheduledEndsAt.getTime() + POST_CLASS_ROOM_GRACE_MS;
  const minLife = createdAt.getTime() + 60 * 60 * 1000;
  const hardCap = now + SCHEDULE_ROOM_HARD_CAP_MS;
  return new Date(Math.min(Math.max(scheduleEnd, minLife), hardCap));
}

export function isDailyRoomPastExpiry(
  roomExpiresAt: Date | string | null | undefined,
  nowMs = Date.now(),
  graceMs = DAILY_TOKEN_GRACE_MS,
): boolean {
  if (!roomExpiresAt) return false;
  const expires =
    typeof roomExpiresAt === "string"
      ? new Date(roomExpiresAt).getTime()
      : roomExpiresAt.getTime();
  return Number.isFinite(expires) && nowMs > expires + graceMs;
}

export function computeMeetingTokenExpUnix(input: {
  nowMs?: number;
  roomExpiresAt: Date | string | null;
  /** When true, no soft grace past room expiry (session already ended). */
  sessionEnded?: boolean;
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
  const grace = input.sessionEnded ? 0 : DAILY_TOKEN_GRACE_MS;
  const withGrace = roomEnd + grace;
  return Math.floor(Math.min(tokenCap, withGrace) / 1000);
}

function earlyJoinMsForRole(role: DailyJoinRole | undefined): number {
  if (role === "teacher") return TEACHER_EARLY_JOIN_MS;
  return STUDENT_EARLY_JOIN_MS;
}

/**
 * Ad-hoc or schedule-aware join gate for issuing Daily tokens.
 * When scheduledStartsAt is set (nearby weekly slot), role-based early join applies.
 */
export function evaluateSessionJoinability(input: {
  status: string;
  endedAt?: string | null;
  roomExpiresAt?: string | null;
  scheduledStartsAt?: Date | string | null;
  role?: DailyJoinRole;
  nowMs?: number;
  /** When true, skip room_expired (e.g. provisional leave while still in call). */
  ignoreRoomExpiry?: boolean;
  /** When true, skip too_early (e.g. room metadata probe). */
  ignoreEarlyJoin?: boolean;
}): SessionJoinability {
  const now = input.nowMs ?? Date.now();

  if (input.status === "ended" || input.endedAt) {
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

  if (
    !input.ignoreRoomExpiry &&
    isDailyRoomPastExpiry(input.roomExpiresAt, now)
  ) {
    return {
      ok: false,
      code: "room_expired",
      message: "The video room for this session has expired.",
    };
  }

  if (!input.ignoreEarlyJoin && input.scheduledStartsAt) {
    const start =
      typeof input.scheduledStartsAt === "string"
        ? new Date(input.scheduledStartsAt).getTime()
        : input.scheduledStartsAt.getTime();
    if (Number.isFinite(start)) {
      const allowedFrom = start - earlyJoinMsForRole(input.role);
      if (now < allowedFrom) {
        const minutes = Math.ceil((allowedFrom - now) / 60_000);
        return {
          ok: false,
          code: "too_early",
          message:
            input.role === "teacher"
              ? `Video opens ${TEACHER_EARLY_JOIN_MS / 60_000} minutes before class (${minutes} min left).`
              : `Video opens ${STUDENT_EARLY_JOIN_MS / 60_000} minutes before class (${minutes} min left).`,
        };
      }
    }
  }

  return { ok: true };
}

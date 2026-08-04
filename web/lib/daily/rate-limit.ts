import "server-only";

import { rateLimitAllow } from "@/lib/rate-limit/memory";

/** Token minting: generous enough for refresh + reconnect, tight against abuse. */
export function allowDailyTokenRequest(participantKey: string, sessionId: string): boolean {
  return rateLimitAllow(
    `daily-token:${sessionId}:${participantKey}`,
    30,
    60 * 1000,
  );
}

/** Provisional attendance join/leave spam guard. */
export function allowDailyAttendanceRequest(
  participantKey: string,
  sessionId: string,
): boolean {
  return rateLimitAllow(
    `daily-attendance:${sessionId}:${participantKey}`,
    60,
    60 * 1000,
  );
}

/** Host room create/ensure. */
export function allowDailyRoomCreate(hostUserId: string, sessionId: string): boolean {
  return rateLimitAllow(`daily-room:${sessionId}:${hostUserId}`, 20, 60 * 1000);
}

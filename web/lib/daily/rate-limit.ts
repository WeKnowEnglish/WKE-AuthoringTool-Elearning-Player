import "server-only";

import { rateLimitAllow } from "@/lib/rate-limit";

/** Token minting: generous enough for refresh + reconnect, tight against abuse. */
export async function allowDailyTokenRequest(
  participantKey: string,
  sessionId: string,
): Promise<boolean> {
  return rateLimitAllow(
    `daily-token:${sessionId}:${participantKey}`,
    30,
    60 * 1000,
  );
}

/** Provisional attendance join/leave spam guard. */
export async function allowDailyAttendanceRequest(
  participantKey: string,
  sessionId: string,
): Promise<boolean> {
  return rateLimitAllow(
    `daily-attendance:${sessionId}:${participantKey}`,
    60,
    60 * 1000,
  );
}

/** Host room create/ensure. */
export async function allowDailyRoomCreate(
  hostUserId: string,
  sessionId: string,
): Promise<boolean> {
  return rateLimitAllow(`daily-room:${sessionId}:${hostUserId}`, 20, 60 * 1000);
}

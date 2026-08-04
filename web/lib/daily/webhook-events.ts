import type { DailyCallRole } from "@/lib/daily/types";

export type DailyWebhookEnvelope = {
  version?: string;
  type?: string;
  id?: string;
  payload?: Record<string, unknown>;
  event_ts?: number;
};

export type DailyParticipantWebhookPayload = {
  room: string;
  user_id: string;
  user_name?: string;
  session_id: string;
  joined_at?: number;
  duration?: number;
  owner?: boolean;
};

export function parseDailyWebhookEnvelope(raw: unknown): DailyWebhookEnvelope | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as DailyWebhookEnvelope;
}

export function parseParticipantPayload(
  payload: Record<string, unknown> | undefined,
): DailyParticipantWebhookPayload | null {
  if (!payload) return null;
  const room = typeof payload.room === "string" ? payload.room.trim() : "";
  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  const sessionId =
    typeof payload.session_id === "string" ? payload.session_id.trim() : "";
  if (!room || !userId || !sessionId) return null;

  return {
    room,
    user_id: userId,
    user_name:
      typeof payload.user_name === "string" ? payload.user_name : undefined,
    session_id: sessionId,
    joined_at:
      typeof payload.joined_at === "number" ? payload.joined_at : undefined,
    duration: typeof payload.duration === "number" ? payload.duration : undefined,
    owner: Boolean(payload.owner),
  };
}

/** Map Daily participant fields → our attendance role. */
export function dailyRoleFromWebhook(input: {
  owner: boolean;
  userId: string;
}): DailyCallRole {
  if (input.owner) return "teacher";
  if (input.userId.startsWith("guest-")) return "guest";
  return "student";
}

export function unixSecondsToIso(seconds: number | undefined, fallback = new Date()): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return fallback.toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

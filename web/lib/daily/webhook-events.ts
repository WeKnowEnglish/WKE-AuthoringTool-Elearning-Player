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

export type DailyTranscriptWebhookPayload = {
  transcriptId: string;
  roomName: string;
  duration?: number;
  status?: string;
  error?: string;
};

export function parseTranscriptPayload(
  payload: Record<string, unknown> | undefined,
): DailyTranscriptWebhookPayload | null {
  if (!payload) return null;
  const transcriptId =
    typeof payload.id === "string"
      ? payload.id.trim()
      : typeof payload.transcriptId === "string"
        ? payload.transcriptId.trim()
        : "";
  const roomName =
    typeof payload.room_name === "string"
      ? payload.room_name.trim()
      : typeof payload.roomName === "string"
        ? payload.roomName.trim()
        : "";
  if (!transcriptId || !roomName) return null;
  return {
    transcriptId,
    roomName,
    duration: typeof payload.duration === "number" ? payload.duration : undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    error:
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : undefined,
  };
}

export const DAILY_TRANSCRIPT_WEBHOOK_TYPES = new Set([
  "transcript.started",
  "transcript.ready-to-download",
  "transcript.error",
]);

export type DailyRecordingWebhookPayload = {
  recordingId: string;
  roomName: string;
  duration?: number;
  status?: string;
  error?: string;
};

export function parseRecordingPayload(
  payload: Record<string, unknown> | undefined,
): DailyRecordingWebhookPayload | null {
  if (!payload) return null;
  const recordingId =
    typeof payload.recording_id === "string"
      ? payload.recording_id.trim()
      : typeof payload.id === "string"
        ? payload.id.trim()
        : "";
  const roomName =
    typeof payload.room_name === "string"
      ? payload.room_name.trim()
      : typeof payload.roomName === "string"
        ? payload.roomName.trim()
        : "";
  if (!recordingId || !roomName) return null;
  return {
    recordingId,
    roomName,
    duration: typeof payload.duration === "number" ? payload.duration : undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    error:
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : undefined,
  };
}

export const DAILY_RECORDING_WEBHOOK_TYPES = new Set([
  "recording.started",
  "recording.ready-to-download",
  "recording.error",
]);


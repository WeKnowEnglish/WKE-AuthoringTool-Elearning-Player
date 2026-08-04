import "server-only";

import {
  findSessionIdByDailyRoomName,
  recordVerifiedAttendanceJoin,
  recordVerifiedAttendanceLeave,
} from "@/lib/daily/attendance";
import { logDaily } from "@/lib/daily/log";
import {
  createProcessingTranscriptRow,
  markLatestProcessingFailed,
  persistReadyTranscript,
} from "@/lib/daily/transcription";
import {
  dailyRoleFromWebhook,
  DAILY_TRANSCRIPT_WEBHOOK_TYPES,
  parseDailyWebhookEnvelope,
  parseParticipantPayload,
  parseTranscriptPayload,
} from "@/lib/daily/webhook-events";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type ProcessDailyWebhookResult = {
  ok: true;
  status: "processed" | "ignored" | "duplicate";
  eventType?: string;
  sessionId?: string | null;
};

async function claimWebhookEvent(input: {
  eventId: string;
  eventType: string;
  roomName?: string | null;
}): Promise<"claimed" | "duplicate" | "reclaimed" | "skipped"> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return "skipped";

  const { error } = await supabase.from("daily_webhook_events").insert({
    event_id: input.eventId,
    event_type: input.eventType,
    room_name: input.roomName ?? null,
    status: "processed",
    received_at: new Date().toISOString(),
  });

  if (!error) return "claimed";

  if (error.code === "23505") {
    const { data: existing } = await supabase
      .from("daily_webhook_events")
      .select("status")
      .eq("event_id", input.eventId)
      .maybeSingle();
    if (existing?.status === "error") {
      await supabase
        .from("daily_webhook_events")
        .update({
          status: "processed",
          error_message: null,
          room_name: input.roomName ?? null,
          received_at: new Date().toISOString(),
        })
        .eq("event_id", input.eventId)
        .eq("status", "error");
      return "reclaimed";
    }
    return "duplicate";
  }

  logDaily("webhook_claim_failed", {
    eventId: input.eventId,
    message: error.message,
  });
  return "skipped";
}

async function finalizeWebhookEvent(input: {
  eventId: string;
  sessionId?: string | null;
  status: "processed" | "ignored" | "error";
  errorMessage?: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("daily_webhook_events")
    .update({
      session_id: input.sessionId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", input.eventId);
}

async function processTranscriptWebhook(input: {
  eventType: string;
  eventId: string | null;
  payload: Record<string, unknown> | undefined;
}): Promise<ProcessDailyWebhookResult> {
  const transcript = parseTranscriptPayload(input.payload);
  if (!transcript) {
    logDaily("webhook_bad_transcript_payload", {
      eventType: input.eventType,
      eventId: input.eventId,
    });
    return { ok: true, status: "ignored", eventType: input.eventType };
  }

  if (input.eventId) {
    const claim = await claimWebhookEvent({
      eventId: input.eventId,
      eventType: input.eventType,
      roomName: transcript.roomName,
    });
    if (claim === "duplicate") {
      return { ok: true, status: "duplicate", eventType: input.eventType };
    }
  }

  const sessionId = await findSessionIdByDailyRoomName(transcript.roomName);
  if (!sessionId) {
    if (input.eventId) {
      await finalizeWebhookEvent({
        eventId: input.eventId,
        status: "ignored",
        errorMessage: "No class_sessions row for transcript room",
      });
    }
    return { ok: true, status: "ignored", eventType: input.eventType, sessionId: null };
  }

  try {
    if (input.eventType === "transcript.started") {
      await createProcessingTranscriptRow({
        sessionId,
        roomName: transcript.roomName,
      });
    } else if (input.eventType === "transcript.ready-to-download") {
      await persistReadyTranscript({
        sessionId,
        dailyTranscriptId: transcript.transcriptId,
        roomName: transcript.roomName,
        durationSeconds: transcript.duration ?? null,
      });
    } else if (input.eventType === "transcript.error") {
      await markLatestProcessingFailed(
        sessionId,
        transcript.error ?? "Daily transcript error",
      );
    }

    if (input.eventId) {
      await finalizeWebhookEvent({
        eventId: input.eventId,
        sessionId,
        status: "processed",
      });
    }
    return { ok: true, status: "processed", eventType: input.eventType, sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "transcript process failed";
    logDaily("webhook_transcript_error", {
      eventType: input.eventType,
      eventId: input.eventId,
      message,
    });
    if (input.eventId) {
      await finalizeWebhookEvent({
        eventId: input.eventId,
        sessionId,
        status: "error",
        errorMessage: message,
      });
    }
    return { ok: true, status: "ignored", eventType: input.eventType, sessionId };
  }
}

/**
 * Handle a verified Daily webhook body (signature already checked).
 */
export async function processDailyWebhookBody(
  rawJson: unknown,
): Promise<ProcessDailyWebhookResult> {
  const envelope = parseDailyWebhookEnvelope(rawJson);
  if (!envelope?.type) {
    return { ok: true, status: "ignored" };
  }

  const eventType = envelope.type;
  const eventId =
    typeof envelope.id === "string" && envelope.id.trim()
      ? envelope.id.trim()
      : null;

  if (DAILY_TRANSCRIPT_WEBHOOK_TYPES.has(eventType)) {
    return processTranscriptWebhook({
      eventType,
      eventId,
      payload: envelope.payload,
    });
  }

  if (eventType !== "participant.joined" && eventType !== "participant.left") {
    if (eventId) {
      await claimWebhookEvent({
        eventId,
        eventType,
        roomName: null,
      });
      await finalizeWebhookEvent({
        eventId,
        status: "ignored",
      });
    }
    return { ok: true, status: "ignored", eventType };
  }

  const participant = parseParticipantPayload(envelope.payload);
  if (!participant) {
    logDaily("webhook_bad_payload", { eventType, eventId });
    return { ok: true, status: "ignored", eventType };
  }

  if (eventId) {
    const claim = await claimWebhookEvent({
      eventId,
      eventType,
      roomName: participant.room,
    });
    if (claim === "duplicate") {
      return { ok: true, status: "duplicate", eventType };
    }
  }

  const sessionId = await findSessionIdByDailyRoomName(participant.room);
  if (!sessionId) {
    logDaily("webhook_unknown_room", {
      eventType,
      roomName: participant.room,
    });
    if (eventId) {
      await finalizeWebhookEvent({
        eventId,
        status: "ignored",
        errorMessage: "No class_sessions row for daily_room_name",
      });
    }
    return { ok: true, status: "ignored", eventType, sessionId: null };
  }

  const role = dailyRoleFromWebhook({
    owner: Boolean(participant.owner),
    userId: participant.user_id,
  });

  try {
    if (eventType === "participant.joined") {
      await recordVerifiedAttendanceJoin({
        sessionId,
        participantKey: participant.user_id,
        role,
        dailyParticipantId: participant.session_id,
        joinedAtUnix: participant.joined_at,
      });
    } else {
      await recordVerifiedAttendanceLeave({
        sessionId,
        participantKey: participant.user_id,
        role,
        dailyParticipantId: participant.session_id,
        joinedAtUnix: participant.joined_at,
        durationSeconds: participant.duration,
      });
    }

    if (eventId) {
      await finalizeWebhookEvent({
        eventId,
        sessionId,
        status: "processed",
      });
    }

    return { ok: true, status: "processed", eventType, sessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "process failed";
    logDaily("webhook_process_error", {
      eventType,
      eventId,
      message,
    });
    if (eventId) {
      await finalizeWebhookEvent({
        eventId,
        sessionId,
        status: "error",
        errorMessage: message,
      });
    }
    return { ok: true, status: "ignored", eventType, sessionId };
  }
}

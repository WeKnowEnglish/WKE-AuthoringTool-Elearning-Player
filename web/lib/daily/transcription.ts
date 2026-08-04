import "server-only";

import { dailyRequest, type DailyFetch } from "@/lib/daily/client";
import { logDaily } from "@/lib/daily/log";
import { DailyApiError } from "@/lib/daily/types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export const VC_TRANSCRIPTS_BUCKET = "vc_transcripts";

export type ClassSessionTranscriptRow = {
  id: string;
  sessionId: string;
  dailyTranscriptId: string | null;
  dailyRoomName: string | null;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  language: string;
  storageBucket: string | null;
  storagePath: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  readyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapTranscriptRow(row: Record<string, unknown>): ClassSessionTranscriptRow {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    dailyTranscriptId: (row.daily_transcript_id as string | null) ?? null,
    dailyRoomName: (row.daily_room_name as string | null) ?? null,
    status: row.status as ClassSessionTranscriptRow["status"],
    language: (row.language as string) ?? "en",
    storageBucket: (row.storage_bucket as string | null) ?? null,
    storagePath: (row.storage_path as string | null) ?? null,
    durationSeconds:
      row.duration_seconds == null ? null : Number(row.duration_seconds),
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    readyAt: (row.ready_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listTranscriptsForSession(
  sessionId: string,
): Promise<ClassSessionTranscriptRow[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("class_session_transcripts")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map(mapTranscriptRow);
}

export async function getLatestTranscriptForSession(
  sessionId: string,
): Promise<ClassSessionTranscriptRow | null> {
  const rows = await listTranscriptsForSession(sessionId);
  return rows[0] ?? null;
}

export async function startDailyRoomTranscription(input: {
  roomName: string;
  language?: string;
  fetchImpl?: DailyFetch;
}): Promise<void> {
  await dailyRequest(
    `/rooms/${encodeURIComponent(input.roomName)}/transcription/start`,
    {
      method: "POST",
      fetchImpl: input.fetchImpl,
      body: {
        language: input.language ?? "en",
        model: "nova-2-general",
        punctuate: true,
      },
    },
  );
  logDaily("transcription_start_sent", { roomName: input.roomName });
}

export async function stopDailyRoomTranscription(input: {
  roomName: string;
  fetchImpl?: DailyFetch;
}): Promise<void> {
  await dailyRequest(
    `/rooms/${encodeURIComponent(input.roomName)}/transcription/stop`,
    {
      method: "POST",
      fetchImpl: input.fetchImpl,
      body: {},
    },
  );
  logDaily("transcription_stop_sent", { roomName: input.roomName });
}

export async function fetchDailyTranscriptAccessLink(
  dailyTranscriptId: string,
  fetchImpl?: DailyFetch,
): Promise<string> {
  const response = await dailyRequest<{ link?: string; download_link?: string }>(
    `/transcript/${encodeURIComponent(dailyTranscriptId)}/access-link`,
    { fetchImpl },
  );
  const link = response.link ?? response.download_link;
  if (!link) {
    throw new DailyApiError("Daily transcript access-link missing URL.", 502);
  }
  return link;
}

export async function markSessionTranscriptionEnabled(
  sessionId: string,
  enabled: boolean,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("class_sessions")
    .update({ transcription_enabled: enabled })
    .eq("id", sessionId);
}

export async function createProcessingTranscriptRow(input: {
  sessionId: string;
  roomName: string;
  language?: string;
}): Promise<ClassSessionTranscriptRow | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("class_session_transcripts")
    .insert({
      session_id: input.sessionId,
      daily_room_name: input.roomName,
      status: "processing",
      language: input.language ?? "en",
      started_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    logDaily("transcript_row_create_failed", {
      sessionId: input.sessionId,
      message: error?.message ?? "no data",
    });
    return null;
  }
  return mapTranscriptRow(data as Record<string, unknown>);
}

export async function markLatestProcessingFailed(
  sessionId: string,
  message: string,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  const latest = await getLatestTranscriptForSession(sessionId);
  if (!latest || latest.status === "ready") return;
  await supabase
    .from("class_session_transcripts")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", latest.id);
}

/**
 * Download VTT from Daily signed link and store privately.
 */
export async function persistReadyTranscript(input: {
  sessionId: string;
  dailyTranscriptId: string;
  roomName: string;
  durationSeconds?: number | null;
  fetchImpl?: DailyFetch;
}): Promise<ClassSessionTranscriptRow | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const accessUrl = await fetchDailyTranscriptAccessLink(
    input.dailyTranscriptId,
    input.fetchImpl,
  );
  const fetchImpl = input.fetchImpl ?? fetch;
  const fileRes = await fetchImpl(accessUrl);
  if (!fileRes.ok) {
    throw new DailyApiError(
      `Failed to download transcript (${fileRes.status}).`,
      502,
    );
  }
  const bytes = Buffer.from(await fileRes.arrayBuffer());
  const storagePath = `${input.sessionId}/${input.dailyTranscriptId}.vtt`;

  const { error: uploadError } = await supabase.storage
    .from(VC_TRANSCRIPTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: "text/vtt",
      upsert: true,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("class_session_transcripts")
    .select("id")
    .eq("daily_transcript_id", input.dailyTranscriptId)
    .maybeSingle();

  if (existing?.id) {
    const { data } = await supabase
      .from("class_session_transcripts")
      .update({
        status: "ready",
        storage_bucket: VC_TRANSCRIPTS_BUCKET,
        storage_path: storagePath,
        duration_seconds: input.durationSeconds ?? null,
        ready_at: now,
        updated_at: now,
        error_message: null,
        daily_room_name: input.roomName,
      })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    await markSessionTranscriptionEnabled(input.sessionId, false);
    return data ? mapTranscriptRow(data as Record<string, unknown>) : null;
  }

  // Attach to latest processing row for this session, or insert.
  const latest = await getLatestTranscriptForSession(input.sessionId);
  if (latest && (latest.status === "processing" || latest.status === "pending")) {
    const { data } = await supabase
      .from("class_session_transcripts")
      .update({
        daily_transcript_id: input.dailyTranscriptId,
        status: "ready",
        storage_bucket: VC_TRANSCRIPTS_BUCKET,
        storage_path: storagePath,
        duration_seconds: input.durationSeconds ?? null,
        ready_at: now,
        updated_at: now,
        error_message: null,
        daily_room_name: input.roomName,
      })
      .eq("id", latest.id)
      .select("*")
      .maybeSingle();
    await markSessionTranscriptionEnabled(input.sessionId, false);
    return data ? mapTranscriptRow(data as Record<string, unknown>) : null;
  }

  const { data, error } = await supabase
    .from("class_session_transcripts")
    .insert({
      session_id: input.sessionId,
      daily_transcript_id: input.dailyTranscriptId,
      daily_room_name: input.roomName,
      status: "ready",
      language: "en",
      storage_bucket: VC_TRANSCRIPTS_BUCKET,
      storage_path: storagePath,
      duration_seconds: input.durationSeconds ?? null,
      started_at: now,
      ready_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    logDaily("transcript_persist_failed", {
      sessionId: input.sessionId,
      message: error.message,
    });
    throw new Error(error.message);
  }

  await markSessionTranscriptionEnabled(input.sessionId, false);
  logDaily("transcript_ready_stored", {
    sessionId: input.sessionId,
    dailyTranscriptId: input.dailyTranscriptId,
  });
  return data ? mapTranscriptRow(data as Record<string, unknown>) : null;
}

export async function createTranscriptSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(VC_TRANSCRIPTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Strip WebVTT to readable plain lines for teacher review. */
export function vttToPlainText(vtt: string): string {
  const lines = vtt.replace(/^\uFEFF/, "").split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "WEBVTT") continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/-->/.test(trimmed)) continue;
    if (trimmed.startsWith("NOTE")) continue;
    out.push(trimmed);
  }
  return out.join("\n");
}

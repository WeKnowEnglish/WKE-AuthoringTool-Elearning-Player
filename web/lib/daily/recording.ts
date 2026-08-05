import "server-only";

import { dailyRequest, type DailyFetch } from "@/lib/daily/client";
import { logDaily } from "@/lib/daily/log";
import { DailyApiError } from "@/lib/daily/types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export const VC_RECORDINGS_BUCKET = "vc_recordings";

export type ClassSessionRecordingRow = {
  id: string;
  sessionId: string;
  dailyRecordingId: string | null;
  dailyRoomName: string | null;
  status: "pending" | "processing" | "ready" | "failed" | "expired";
  storageBucket: string | null;
  storagePath: string | null;
  contentType: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  readyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRecordingRow(row: Record<string, unknown>): ClassSessionRecordingRow {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    dailyRecordingId: (row.daily_recording_id as string | null) ?? null,
    dailyRoomName: (row.daily_room_name as string | null) ?? null,
    status: row.status as ClassSessionRecordingRow["status"],
    storageBucket: (row.storage_bucket as string | null) ?? null,
    storagePath: (row.storage_path as string | null) ?? null,
    contentType: (row.content_type as string | null) ?? null,
    durationSeconds:
      row.duration_seconds == null ? null : Number(row.duration_seconds),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    readyAt: (row.ready_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listRecordingsForSession(
  sessionId: string,
): Promise<ClassSessionRecordingRow[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("class_session_recordings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map(mapRecordingRow);
}

export async function getLatestRecordingForSession(
  sessionId: string,
): Promise<ClassSessionRecordingRow | null> {
  const rows = await listRecordingsForSession(sessionId);
  return rows[0] ?? null;
}

export async function startDailyRoomRecording(input: {
  roomName: string;
  fetchImpl?: DailyFetch;
}): Promise<void> {
  // Ensure cloud recording is allowed (covers rooms created before Phase 3b).
  try {
    await dailyRequest(`/rooms/${encodeURIComponent(input.roomName)}`, {
      method: "POST",
      fetchImpl: input.fetchImpl,
      body: { properties: { enable_recording: "cloud" } },
    });
  } catch (error) {
    logDaily("recording_room_enable_patch_failed", {
      roomName: input.roomName,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  await dailyRequest(`/rooms/${encodeURIComponent(input.roomName)}/recordings/start`, {
    method: "POST",
    fetchImpl: input.fetchImpl,
    body: { type: "cloud" },
  });
  logDaily("recording_start_sent", { roomName: input.roomName });
}

export async function stopDailyRoomRecording(input: {
  roomName: string;
  fetchImpl?: DailyFetch;
}): Promise<void> {
  await dailyRequest(`/rooms/${encodeURIComponent(input.roomName)}/recordings/stop`, {
    method: "POST",
    fetchImpl: input.fetchImpl,
    body: {},
  });
  logDaily("recording_stop_sent", { roomName: input.roomName });
}

export async function fetchDailyRecordingAccessLink(
  dailyRecordingId: string,
  fetchImpl?: DailyFetch,
): Promise<string> {
  const response = await dailyRequest<{
    download_link?: string;
    link?: string;
  }>(`/recordings/${encodeURIComponent(dailyRecordingId)}/access-link`, {
    fetchImpl,
  });
  const link = response.download_link ?? response.link;
  if (!link) {
    throw new DailyApiError("Daily recording access-link missing URL.", 502);
  }
  return link;
}

export async function markSessionRecordingEnabled(
  sessionId: string,
  enabled: boolean,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("class_sessions")
    .update({ recording_enabled: enabled })
    .eq("id", sessionId);
}

export async function createProcessingRecordingRow(input: {
  sessionId: string;
  roomName: string;
}): Promise<ClassSessionRecordingRow | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("class_session_recordings")
    .insert({
      session_id: input.sessionId,
      daily_room_name: input.roomName,
      status: "processing",
      started_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    logDaily("recording_row_create_failed", {
      sessionId: input.sessionId,
      message: error?.message ?? "no data",
    });
    return null;
  }
  return mapRecordingRow(data as Record<string, unknown>);
}

export async function markLatestRecordingFailed(
  sessionId: string,
  message: string,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  const latest = await getLatestRecordingForSession(sessionId);
  if (!latest || latest.status === "ready") return;
  await supabase
    .from("class_session_recordings")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", latest.id);
}

function guessContentType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes(".mp4")) return "video/mp4";
  if (lower.includes("audio")) return "audio/webm";
  return "video/webm";
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.startsWith("audio/")) return "webm";
  return "webm";
}

export async function persistReadyRecording(input: {
  sessionId: string;
  dailyRecordingId: string;
  roomName: string;
  durationSeconds?: number | null;
  fetchImpl?: DailyFetch;
}): Promise<ClassSessionRecordingRow | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const accessUrl = await fetchDailyRecordingAccessLink(
    input.dailyRecordingId,
    input.fetchImpl,
  );
  const fetchImpl = input.fetchImpl ?? fetch;
  const fileRes = await fetchImpl(accessUrl);
  if (!fileRes.ok) {
    throw new DailyApiError(
      `Failed to download recording (${fileRes.status}).`,
      502,
    );
  }
  const bytes = Buffer.from(await fileRes.arrayBuffer());
  const contentType =
    fileRes.headers.get("content-type")?.split(";")[0]?.trim() ||
    guessContentType(accessUrl);
  const ext = extensionForContentType(contentType);
  const storagePath = `${input.sessionId}/${input.dailyRecordingId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(VC_RECORDINGS_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const now = new Date().toISOString();
  const patch = {
    daily_recording_id: input.dailyRecordingId,
    status: "ready" as const,
    storage_bucket: VC_RECORDINGS_BUCKET,
    storage_path: storagePath,
    content_type: contentType,
    duration_seconds: input.durationSeconds ?? null,
    size_bytes: bytes.byteLength,
    ready_at: now,
    updated_at: now,
    error_message: null as string | null,
    daily_room_name: input.roomName,
  };

  const { data: existing } = await supabase
    .from("class_session_recordings")
    .select("id")
    .eq("daily_recording_id", input.dailyRecordingId)
    .maybeSingle();

  if (existing?.id) {
    const { data } = await supabase
      .from("class_session_recordings")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    await markSessionRecordingEnabled(input.sessionId, false);
    return data ? mapRecordingRow(data as Record<string, unknown>) : null;
  }

  const latest = await getLatestRecordingForSession(input.sessionId);
  if (latest && (latest.status === "processing" || latest.status === "pending")) {
    const { data } = await supabase
      .from("class_session_recordings")
      .update(patch)
      .eq("id", latest.id)
      .select("*")
      .maybeSingle();
    await markSessionRecordingEnabled(input.sessionId, false);
    return data ? mapRecordingRow(data as Record<string, unknown>) : null;
  }

  const { data, error } = await supabase
    .from("class_session_recordings")
    .insert({
      session_id: input.sessionId,
      ...patch,
      started_at: now,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    logDaily("recording_persist_failed", {
      sessionId: input.sessionId,
      message: error.message,
    });
    throw new Error(error.message);
  }

  await markSessionRecordingEnabled(input.sessionId, false);
  logDaily("recording_ready_stored", {
    sessionId: input.sessionId,
    dailyRecordingId: input.dailyRecordingId,
  });
  return data ? mapRecordingRow(data as Record<string, unknown>) : null;
}

export async function createRecordingSignedUrl(
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(VC_RECORDINGS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

"use server";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "voice_submissions";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_AUDIO = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
  "audio/x-m4a",
]);

function sanitizeSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

export async function uploadStudentVoiceSubmission(formData: FormData): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const screenId = String(formData.get("screen_id") ?? "").trim();
  const activitySubtype = String(formData.get("activity_subtype") ?? "").trim();
  const studentSessionId = String(formData.get("student_session_id") ?? "").trim();
  const turnIdRaw = String(formData.get("turn_id") ?? "").trim();
  const turnIndexRaw = String(formData.get("turn_index") ?? "").trim();
  const durationMsRaw = String(formData.get("duration_ms") ?? "").trim();

  const blob = formData.get("audio");
  if (!blob || typeof blob === "string" || !("arrayBuffer" in blob)) {
    throw new Error("Audio file is required.");
  }
  if (!lessonId || !screenId || !activitySubtype || !studentSessionId) {
    throw new Error("Missing required submission metadata.");
  }

  const file = blob as File;
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Audio size must be between 1 byte and 8 MB.");
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_AUDIO.has(contentType)) {
    throw new Error("Unsupported audio format.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "webm";
  const turnId = turnIdRaw ? sanitizeSegment(turnIdRaw) : null;
  const turnIndex = turnIndexRaw ? Number(turnIndexRaw) : null;
  const durationMs = durationMsRaw ? Number(durationMsRaw) : null;

  const pathParts = [
    sanitizeSegment(lessonId),
    sanitizeSegment(screenId),
    sanitizeSegment(studentSessionId),
    turnId ?? "single",
    `${crypto.randomUUID()}.${ext}`,
  ];
  const storagePath = pathParts.join("/");
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: row, error: insertError } = await supabase
    .from("student_voice_submissions")
    .insert({
      lesson_id: lessonId,
      screen_id: screenId,
      activity_subtype: activitySubtype,
      student_session_id: studentSessionId,
      student_user_id: user?.id ?? null,
      turn_id: turnId,
      turn_index: Number.isFinite(turnIndex) ? turnIndex : null,
      storage_path: storagePath,
      content_type: contentType,
      duration_ms: Number.isFinite(durationMs) ? durationMs : null,
      byte_size: file.size,
      status: "submitted",
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  return { id: String(row.id) };
}

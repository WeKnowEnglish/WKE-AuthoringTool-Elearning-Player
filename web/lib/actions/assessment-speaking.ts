"use server";

import { revalidatePath } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import { listAssessmentParts, type AssessmentSpeakingRecording } from "@/lib/assessment";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { resolveHomeworkAssessmentDefinition } from "@/lib/class-homework/resolve-assessment-definition";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "voice_submissions";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_AUDIO = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac", "audio/x-m4a"]);

export type SaveAssessmentSpeakingResult =
  | { ok: true; recording: AssessmentSpeakingRecording }
  | { ok: false; error: string };

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

export async function saveAssessmentSpeakingRecording(formData: FormData): Promise<SaveAssessmentSpeakingResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return { ok: false, error: "Student authentication required." };

  const homeworkId = String(formData.get("homework_id") ?? "").trim();
  const partId = String(formData.get("part_id") ?? "").trim();
  const responseId = String(formData.get("response_id") ?? "").trim();
  const durationMs = Number(formData.get("duration_ms"));
  const audio = formData.get("audio");

  const { data: homework } = await supabase.from("class_homework").select("id, class_id, teacher_id, status, payload").eq("id", homeworkId).maybeSingle();
  const payload = normalizeHomeworkPayload(homework?.payload);
  if (!homework || homework.status !== "assigned" || payload?.type !== "primary_a2_assessment") {
    return { ok: false, error: "This assessment is not available for recording." };
  }
  const definition = resolveHomeworkAssessmentDefinition(payload);
  const part = listAssessmentParts(definition).find((item) => item.id === partId);
  if (!part || !(part.kind === "speaking_picture_differences" || part.kind === "speaking_question_exchange" || part.kind === "speaking_picture_story") || part.activity.responseId !== responseId) {
    return { ok: false, error: "This speaking prompt is not part of the assessment." };
  }
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > part.activity.maxDurationSeconds * 1000) {
    return { ok: false, error: "The recording duration is invalid." };
  }
  if (!audio || typeof audio === "string" || !(audio instanceof Blob)) {
    return { ok: false, error: "Please record an answer before saving." };
  }
  const file = audio as File;
  const contentType = file.type.split(";")[0]?.toLowerCase() || "audio/webm";
  if (file.size <= 0 || file.size > MAX_BYTES) return { ok: false, error: "The recording must be smaller than 8 MB." };
  if (!ALLOWED_AUDIO.has(contentType)) return { ok: false, error: "This browser recorded an unsupported audio format." };

  const { data: memberships, error: membershipError } = await supabase.rpc("student_class_memberships");
  if (membershipError) return { ok: false, error: membershipError.message };
  if (!((memberships ?? []) as Array<{ class_id: string }>).some((row) => row.class_id === homework.class_id)) {
    return { ok: false, error: "You are not enrolled in this class." };
  }

  const { data: previous, error: previousError } = await supabase.from("assessment_speaking_recordings").select("storage_path").eq("homework_id", homeworkId).eq("student_id", user.id).eq("part_id", partId).maybeSingle();
  if (previousError) return { ok: false, error: /assessment_speaking_recordings|schema cache|does not exist/i.test(previousError.message)
    ? "Speaking uploads are not available until migration 100 is applied."
    : previousError.message };

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
  const storagePath = ["assessment", safeSegment(homeworkId), user.id, safeSegment(partId), `${crypto.randomUUID()}.${extension}`].join("/");
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, new Uint8Array(await file.arrayBuffer()), { contentType, upsert: false });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: saved, error: saveError } = await supabase.from("assessment_speaking_recordings").upsert({
    homework_id: homeworkId,
    student_id: user.id,
    part_id: partId,
    response_id: responseId,
    storage_path: storagePath,
    content_type: contentType,
    duration_ms: Math.round(durationMs),
    byte_size: file.size,
    updated_at: new Date().toISOString(),
  }, { onConflict: "homework_id,student_id,part_id" }).select("id, part_id, response_id, duration_ms").single();
  if (saveError || !saved) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: /assessment_speaking_recordings|schema cache|does not exist/i.test(saveError?.message ?? "")
      ? "Speaking uploads are not available until migration 100 is applied."
      : saveError?.message ?? "Could not save the recording." };
  }
  if (previous?.storage_path && previous.storage_path !== storagePath) await supabase.storage.from(BUCKET).remove([String(previous.storage_path)]);
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  revalidatePath(`/primary/homework/${homeworkId}`);
  revalidatePath(`/teacher/classes/${String(homework.class_id)}/assessment-results/${homeworkId}`);
  return { ok: true, recording: { id: String(saved.id), partId: String(saved.part_id), responseId: String(saved.response_id), durationMs: Number(saved.duration_ms), url: signed?.signedUrl ?? "" } };
}

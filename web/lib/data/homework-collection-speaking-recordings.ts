import { unstable_noStore as noStore } from "next/cache";
import type { AssessmentSpeakingRecording } from "@/lib/assessment";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

async function signedRecording(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    id: unknown;
    part_id: unknown;
    response_id: unknown;
    duration_ms: unknown;
    storage_path: unknown;
  },
): Promise<AssessmentSpeakingRecording> {
  const { data } = await supabase.storage
    .from("voice_submissions")
    .createSignedUrl(String(row.storage_path), 60 * 60);
  return {
    id: String(row.id),
    partId: String(row.part_id),
    responseId: String(row.response_id),
    durationMs: Number(row.duration_ms),
    url: data?.signedUrl ?? "",
  };
}

export async function getMyHomeworkCollectionSpeakingRecordings(
  homeworkId: string,
): Promise<AssessmentSpeakingRecording[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isStudent(user)) return [];
  const { data, error } = await supabase
    .from("homework_collection_speaking_recordings")
    .select("id, part_id, response_id, duration_ms, storage_path")
    .eq("homework_id", homeworkId)
    .eq("student_id", user.id);
  if (error) return [];
  return Promise.all((data ?? []).map((row) => signedRecording(supabase, row)));
}

export async function listHomeworkCollectionSpeakingRecordingsForTeacher(input: {
  classId: string;
  homeworkId: string;
}): Promise<Map<string, AssessmentSpeakingRecording[]>> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  const { data: homework } = await supabase
    .from("class_homework")
    .select("id")
    .eq("id", input.homeworkId)
    .eq("class_id", input.classId)
    .eq("teacher_id", user.id)
    .maybeSingle();
  if (!homework) return new Map();

  const { data, error } = await supabase
    .from("homework_collection_speaking_recordings")
    .select("id, student_id, part_id, response_id, duration_ms, storage_path")
    .eq("homework_id", input.homeworkId);
  if (error) {
    if (
      /homework_collection_speaking_recordings|schema cache|does not exist/i.test(
        error.message,
      )
    ) {
      return new Map();
    }
    throw error;
  }

  const recordings = new Map<string, AssessmentSpeakingRecording[]>();
  await Promise.all(
    (data ?? []).map(async (row) => {
      const studentId = String(row.student_id);
      const recording = await signedRecording(supabase, row);
      recordings.set(studentId, [...(recordings.get(studentId) ?? []), recording]);
    }),
  );
  return recordings;
}

"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const PART_IDS = ["speaking-part-1", "speaking-part-2", "speaking-part-3"] as const;

export async function saveAssessmentSpeakingReview(input: { classId: string; homeworkId: string; studentId: string; scores: Record<string, number>; feedback: string }): Promise<{ ok: true; reviewedAt: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) return { ok: false, error: "Teacher authentication required." };
  const { data: homework } = await supabase.from("class_homework").select("id").eq("id", input.homeworkId).eq("class_id", input.classId).eq("teacher_id", user.id).maybeSingle();
  if (!homework) return { ok: false, error: "Assessment not found." };
  const { data: enrollment } = await supabase.from("class_enrollments").select("student_id").eq("class_id", input.classId).eq("student_id", input.studentId).maybeSingle();
  if (!enrollment) return { ok: false, error: "Student is not enrolled in this class." };
  const scores: Record<string, number> = {};
  for (const partId of PART_IDS) {
    const score = Number(input.scores[partId]);
    if (!Number.isFinite(score) || score < 0 || score > 5) return { ok: false, error: "Give each speaking part a score from 0 to 5." };
    scores[partId] = Math.round(score);
  }
  const feedback = input.feedback.trim().slice(0, 2000);
  const now = new Date().toISOString();
  const { error } = await supabase.from("assessment_speaking_reviews").upsert({ homework_id: input.homeworkId, student_id: input.studentId, teacher_id: user.id, scores, feedback, reviewed_at: now, updated_at: now }, { onConflict: "homework_id,student_id" });
  if (error) return { ok: false, error: /assessment_speaking_reviews|schema cache|does not exist/i.test(error.message) ? "Speaking reviews require migration 104." : error.message };
  revalidatePath(`/teacher/classes/${input.classId}/assessment-results/${input.homeworkId}`);
  revalidatePath(`/primary/homework/${input.homeworkId}`);
  return { ok: true, reviewedAt: now };
}

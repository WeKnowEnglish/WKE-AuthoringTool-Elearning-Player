"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { normalizeHomeworkTemplateSubmissionContent } from "@/lib/homework-templates/homework-template-submission";
import { normalizeHomeworkTemplateGrades } from "@/lib/homework-templates/homework-template-review";
import { isHomeworkTemplatePartId } from "@/lib/homework-templates/registry";
import { createClient } from "@/lib/supabase/server";

export async function saveHomeworkTemplateReview(input: {
  classId: string;
  homeworkId: string;
  submissionId: string;
  grades: unknown;
  feedback?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) return { ok: false, error: "Teacher authentication required." };

    const classId = input.classId.trim();
    const homeworkId = input.homeworkId.trim();
    const submissionId = input.submissionId.trim();
    if (!classId || !homeworkId || !submissionId) return { ok: false, error: "Missing homework review details." };

    const [{ data: homework, error: homeworkError }, { data: submission, error: submissionError }] = await Promise.all([
      supabase.from("class_homework").select("id, class_id, teacher_id, payload").eq("id", homeworkId).eq("class_id", classId).eq("teacher_id", user.id).maybeSingle(),
      supabase.from("homework_template_submissions").select("id, homework_id, student_id, content").eq("id", submissionId).eq("homework_id", homeworkId).maybeSingle(),
    ]);
    if (homeworkError) return { ok: false, error: homeworkError.message };
    if (submissionError) return { ok: false, error: submissionError.message };
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (!homework || !submission || payload?.type !== "homework_template") return { ok: false, error: "Homework submission not found." };

    const content = normalizeHomeworkTemplateSubmissionContent(submission.content);
    const requestedGrades = normalizeHomeworkTemplateGrades(input.grades);
    const grades = Object.fromEntries(Object.entries(requestedGrades).filter(([partId, grade]) => {
      const part = content.parts[partId];
      return Boolean(part && isHomeworkTemplatePartId(payload.templateId, partId) && grade.maxScore === part.total);
    }));
    if (Object.keys(requestedGrades).length !== Object.keys(grades).length) return { ok: false, error: "One or more grades do not match this submission." };

    const now = new Date().toISOString();
    const feedback = typeof input.feedback === "string" ? input.feedback.trim().slice(0, 2000) : "";
    const { error } = await supabase.from("homework_template_reviews").upsert({
      submission_id: submissionId,
      homework_id: homeworkId,
      student_id: String(submission.student_id),
      teacher_id: user.id,
      grades,
      feedback,
      reviewed_at: now,
      updated_at: now,
    }, { onConflict: "submission_id" });
    if (error) {
      if (/homework_template_reviews|schema cache|does not exist/i.test(error.message)) return { ok: false, error: "Template grading requires migration 110." };
      return { ok: false, error: error.message };
    }
    revalidatePath(`/teacher/classes/${classId}/homework-template-results/${homeworkId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save this homework review." };
  }
}

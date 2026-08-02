"use server";

import { revalidatePath } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { emptyHomeworkTemplateSubmissionContent, normalizeHomeworkTemplatePartSnapshot, normalizeHomeworkTemplateSubmissionContent } from "@/lib/homework-templates/homework-template-submission";
import { createClient } from "@/lib/supabase/server";

const PART_IDS = new Set(["picture-cloze", "word-annotation", "sentence-columns", "verb-table", "picture-writing", "question-writing"]);

export async function saveHomeworkTemplatePart(input: { homeworkId: string; partId: string; snapshot: unknown; submit?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) return { ok: false, error: "Student authentication required." };
    const homeworkId = input.homeworkId.trim();
    const partId = input.partId.trim();
    const snapshot = normalizeHomeworkTemplatePartSnapshot(input.snapshot);
    if (!PART_IDS.has(partId) || !snapshot) return { ok: false, error: "This homework response is invalid." };
    const { data: homework } = await supabase.from("class_homework").select("id, class_id, status, payload").eq("id", homeworkId).maybeSingle();
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (!homework || !["assigned", "closed"].includes(String(homework.status)) || payload?.type !== "homework_template" || payload.templateId !== "homework-template-one") {
      return { ok: false, error: "This homework template is not available." };
    }
    const { data: memberships, error: membershipError } = await supabase.rpc("student_class_memberships");
    if (membershipError) return { ok: false, error: membershipError.message };
    if (!((memberships ?? []) as Array<{ class_id: string }>).some((row) => row.class_id === homework.class_id)) return { ok: false, error: "You are not enrolled in this class." };
    const { data: existing, error: existingError } = await supabase.from("homework_template_submissions").select("content, status").eq("homework_id", homeworkId).eq("student_id", user.id).maybeSingle();
    if (existingError && /homework_template_submissions|schema cache|does not exist/i.test(existingError.message)) return { ok: false, error: "Template submissions require migration 102." };
    if (existingError) return { ok: false, error: existingError.message };
    if (existing?.status === "submitted" && !input.submit) return { ok: true };
    const content = existing ? normalizeHomeworkTemplateSubmissionContent(existing.content) : emptyHomeworkTemplateSubmissionContent();
    content.parts[partId] = snapshot;
    const now = new Date().toISOString();
    const { error } = await supabase.from("homework_template_submissions").upsert({ homework_id: homeworkId, student_id: user.id, status: input.submit ? "submitted" : "in_progress", content, submitted_at: input.submit ? now : null, updated_at: now }, { onConflict: "homework_id,student_id" });
    if (error) return { ok: false, error: /homework_template_submissions|schema cache|does not exist/i.test(error.message) ? "Template submissions require migration 102." : error.message };
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-template-results/${homeworkId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save the homework response." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import type { StudentActionAuthFailure } from "@/lib/auth/student-action-auth";
import { resolveStudentActionSession } from "@/lib/auth/student-action-auth-server";
import {
  studentHomeworkForbiddenFailure,
  studentHomeworkServiceUnavailableFailure,
  studentHomeworkUnavailableFailure,
} from "@/lib/auth/student-homework-access";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { emptyHomeworkTemplateSubmissionContent, normalizeHomeworkTemplatePartSnapshot, normalizeHomeworkTemplateSubmissionContent } from "@/lib/homework-templates/homework-template-submission";
import { isHomeworkTemplatePartId } from "@/lib/homework-templates/registry";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";

export async function saveHomeworkTemplatePart(input: { homeworkId: string; partId: string; snapshot: unknown; submit?: boolean }): Promise<{ ok: true } | { ok: false; error: string } | StudentActionAuthFailure> {
  try {
    const homeworkId = input.homeworkId.trim();
    const auth = await resolveStudentActionSession({
      nextPath: homeworkId ? `/homework/${encodeURIComponent(homeworkId)}` : "/",
    });
    if (!auth.ok) return auth;
    const { supabase, user } = auth;
    const partId = input.partId.trim();
    const snapshot = normalizeHomeworkTemplatePartSnapshot(input.snapshot);
    if (!snapshot) return { ok: false, error: "This homework response is invalid." };
    const { data: homework, error: homeworkError } = await supabase.from("class_homework").select("id, class_id, status, payload, target_student_ids").eq("id", homeworkId).maybeSingle();
    if (homeworkError) return studentHomeworkServiceUnavailableFailure();
    const payload = normalizeHomeworkPayload(homework?.payload);
    const isTemplate = payload?.type === "homework_template";
    const isGradedTrack = payload?.type === "graded_track";
    if (
      !homework ||
      !["assigned", "closed"].includes(String(homework.status)) ||
      (!isTemplate && !isGradedTrack)
    ) {
      return studentHomeworkUnavailableFailure();
    }
    const templateId = isTemplate
      ? payload.templateId
      : isGradedTrack
        ? payload.originTemplateId
        : null;
    const gradedFreeze = isGradedTrack
      ? parseGradedTrackFreezeDocument(payload.document)
      : null;
    const collectionPartIds = new Set(
      gradedFreeze?.collectionDocument?.parts.map((part) => part.id) ?? [],
    );
    const validPart = isTemplate
      ? Boolean(templateId && isHomeworkTemplatePartId(templateId, partId))
      : Boolean(
          gradedFreeze?.parts.some(
            (part) =>
              (part.id === partId || part.sectionId === partId) &&
              !collectionPartIds.has(part.id),
          ),
        );
    if (!validPart) {
      return { ok: false, error: "This homework response is invalid." };
    }
    const targets = Array.isArray(homework.target_student_ids)
      ? homework.target_student_ids.filter((id): id is string => typeof id === "string")
      : null;
    if (targets && !targets.includes(user.id)) return studentHomeworkForbiddenFailure();
    const { data: memberships, error: membershipError } = await supabase.rpc("student_class_memberships");
    if (membershipError) return studentHomeworkServiceUnavailableFailure();
    if (!((memberships ?? []) as Array<{ class_id: string }>).some((row) => row.class_id === homework.class_id)) return studentHomeworkForbiddenFailure();
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
    revalidatePath(`/secondary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-template-results/${homeworkId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save the homework response." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import {
  homeworkCollectionAttemptFromRow,
  normalizeHomeworkCollectionReviewParts,
} from "@/lib/homework-collections";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export async function saveHomeworkCollectionReview(input: {
  classId: string;
  homeworkId: string;
  attemptId: string;
  parts: unknown;
  feedback?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }
    const classId = input.classId.trim();
    const homeworkId = input.homeworkId.trim();
    const attemptId = input.attemptId.trim();
    if (!classId || !homeworkId || !attemptId) {
      return { ok: false, error: "Missing homework review details." };
    }
    const [{ data: homework, error: homeworkError }, { data: attempt, error: attemptError }] =
      await Promise.all([
        supabase
          .from("class_homework")
          .select("id, class_id, teacher_id, payload")
          .eq("id", homeworkId)
          .eq("class_id", classId)
          .eq("teacher_id", user.id)
          .maybeSingle(),
        supabase
          .from("homework_collection_attempts")
          .select("id, homework_id, student_id, status, content, auto_score, auto_max_score, manual_max_score, submitted_at, updated_at")
          .eq("id", attemptId)
          .eq("homework_id", homeworkId)
          .maybeSingle(),
      ]);
    if (homeworkError) return { ok: false, error: homeworkError.message };
    if (attemptError) return { ok: false, error: attemptError.message };
    const payload = normalizeHomeworkPayload(homework?.payload);
    const freeze = payload?.type === "graded_track"
      ? parseGradedTrackFreezeDocument(payload.document)
      : null;
    if (!homework || !attempt || !freeze?.collectionDocument) {
      return { ok: false, error: "Homework collection attempt not found." };
    }
    const storedAttempt = homeworkCollectionAttemptFromRow(attempt as Record<string, unknown>);
    const requested = normalizeHomeworkCollectionReviewParts(input.parts);
    const validParts = Object.fromEntries(
      Object.entries(requested).filter(([partId, grade]) => {
        const scored = storedAttempt.content.parts[partId];
        return Boolean(
          scored &&
            scored.gradingMode === "teacher_review" &&
            grade.maxScore === scored.maxScore,
        );
      }),
    );
    if (Object.keys(requested).length !== Object.keys(validParts).length) {
      return { ok: false, error: "One or more grades do not match this submission." };
    }
    const admin = createServiceRoleSupabase();
    if (!admin) return { ok: false, error: "Homework review is not configured on this server." };
    const now = new Date().toISOString();
    const feedback = typeof input.feedback === "string"
      ? input.feedback.trim().slice(0, 2000)
      : "";
    const { error } = await admin.from("homework_collection_reviews").upsert(
      {
        attempt_id: attemptId,
        homework_id: homeworkId,
        student_id: storedAttempt.studentId,
        teacher_id: user.id,
        parts: validParts,
        feedback,
        reviewed_at: now,
        updated_at: now,
      },
      { onConflict: "attempt_id" },
    );
    if (error) {
      if (/homework_collection_reviews|schema cache|does not exist/i.test(error.message)) {
        return { ok: false, error: "Homework collection reviews require migration 137." };
      }
      return { ok: false, error: error.message };
    }
    revalidatePath(`/teacher/classes/${classId}/homework-collection-results/${homeworkId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save this review.",
    };
  }
}

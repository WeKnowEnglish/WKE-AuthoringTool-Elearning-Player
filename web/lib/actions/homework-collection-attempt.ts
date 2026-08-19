"use server";

import { revalidatePath } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import {
  homeworkCollectionAttemptFromRow,
  homeworkCollectionAttemptTotals,
  homeworkCollectionRequiredPartsComplete,
  scoreHomeworkCollectionAttempt,
  type HomeworkCollectionAttempt,
} from "@/lib/homework-collections";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

type SaveResult =
  | { ok: true; attempt: HomeworkCollectionAttempt; rewardReceipt?: unknown }
  | { ok: false; error: string };

export async function saveHomeworkCollectionAttempt(input: {
  homeworkId: string;
  responses: unknown;
  submit?: boolean;
}): Promise<SaveResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) {
      return { ok: false, error: "Student authentication required." };
    }
    const homeworkId = input.homeworkId.trim();
    if (!homeworkId) return { ok: false, error: "Missing homework." };

    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, payload, target_student_ids")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homeworkError) return { ok: false, error: homeworkError.message };
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (!homework || payload?.type !== "graded_track" || !["assigned", "closed"].includes(String(homework.status))) {
      return { ok: false, error: "This homework collection is not available." };
    }
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const document = freeze?.collectionDocument;
    if (!document) return { ok: false, error: "This homework has no collection activities." };

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return { ok: false, error: membershipError.message };
    if (!((memberships ?? []) as Array<{ class_id: string }>).some((row) => row.class_id === homework.class_id)) {
      return { ok: false, error: "You are not enrolled in this class." };
    }
    const targets = Array.isArray(homework.target_student_ids)
      ? homework.target_student_ids.filter((id): id is string => typeof id === "string")
      : null;
    if (targets && !targets.includes(user.id)) {
      return { ok: false, error: "This homework was not assigned to you." };
    }

    const content = scoreHomeworkCollectionAttempt(document, input.responses);
    if (input.submit && !homeworkCollectionRequiredPartsComplete(document, content)) {
      return { ok: false, error: "Complete every required activity before submitting." };
    }
    const totals = homeworkCollectionAttemptTotals(content);
    const admin = createServiceRoleSupabase();
    if (!admin) {
      return {
        ok: false,
        error: "Homework collection saving is not configured on this server.",
      };
    }
    const now = new Date().toISOString();
    const { data: existing } = await admin
      .from("homework_collection_attempts")
      .select("id, status")
      .eq("homework_id", homeworkId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (existing?.status === "submitted" && !input.submit) {
      const { data: stored } = await admin
        .from("homework_collection_attempts")
        .select("id, homework_id, student_id, status, content, auto_score, auto_max_score, manual_max_score, submitted_at, updated_at")
        .eq("id", existing.id)
        .single();
      return stored
        ? { ok: true, attempt: homeworkCollectionAttemptFromRow(stored as Record<string, unknown>) }
        : { ok: false, error: "Could not load the submitted homework." };
    }
    const { data: saved, error: saveError } = await admin
      .from("homework_collection_attempts")
      .upsert(
        {
          homework_id: homeworkId,
          student_id: user.id,
          status: input.submit ? "submitted" : "in_progress",
          content,
          auto_score: totals.autoScore,
          auto_max_score: totals.autoMaxScore,
          manual_max_score: totals.manualMaxScore,
          submitted_at: input.submit ? now : null,
          updated_at: now,
        },
        { onConflict: "homework_id,student_id" },
      )
      .select("id, homework_id, student_id, status, content, auto_score, auto_max_score, manual_max_score, submitted_at, updated_at")
      .single();
    if (saveError || !saved) {
      if (/homework_collection_attempts|schema cache|does not exist/i.test(saveError?.message ?? "")) {
        return { ok: false, error: "Homework collections require migration 137." };
      }
      return { ok: false, error: saveError?.message ?? "Could not save this homework." };
    }

    let rewardReceipt: unknown;
    if (input.submit) {
      const { data: completion, error: completionError } = await supabase.rpc(
        "complete_primary_homework",
        { p_homework_id: homeworkId, p_questions_total: totals.itemCount },
      );
      if (completionError) return { ok: false, error: completionError.message };
      rewardReceipt = (completion as { rewardReceipt?: unknown } | null)?.rewardReceipt;
      await admin
        .from("class_homework_completions")
        .update({ correct_count: totals.autoScore, updated_at: now })
        .eq("homework_id", homeworkId)
        .eq("student_id", user.id);
    }

    revalidatePath("/primary");
    revalidatePath("/secondary");
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/secondary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-collection-results/${homeworkId}`);
    return {
      ok: true,
      attempt: homeworkCollectionAttemptFromRow(saved as Record<string, unknown>),
      ...(rewardReceipt ? { rewardReceipt } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save this homework.",
    };
  }
}

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
import { parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import {
  homeworkCollectionAttemptFromRow,
  homeworkCollectionAttemptTotals,
  homeworkCollectionRequiredPartsComplete,
  scoreHomeworkCollectionAttempt,
  type HomeworkCollectionAttempt,
} from "@/lib/homework-collections";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  parseHomeworkFinalizationReceipt,
  type HomeworkFinalizationReceipt,
} from "@/lib/homework-finalization/receipt";

type SaveResult =
  | {
      ok: true;
      attempt: HomeworkCollectionAttempt;
      receipt?: HomeworkFinalizationReceipt;
      rewardReceipt?: Record<string, unknown>;
    }
  | { ok: false; error: string }
  | StudentActionAuthFailure;

export async function saveHomeworkCollectionAttempt(input: {
  homeworkId: string;
  responses: unknown;
  submit?: boolean;
}): Promise<SaveResult> {
  try {
    const homeworkId = input.homeworkId.trim();
    if (!homeworkId) return { ok: false, error: "Missing homework." };
    const auth = await resolveStudentActionSession({
      nextPath: `/homework/${encodeURIComponent(homeworkId)}`,
    });
    if (!auth.ok) return auth;
    const { supabase, user } = auth;

    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, payload, target_student_ids")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homeworkError) return studentHomeworkServiceUnavailableFailure();
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (!homework || payload?.type !== "graded_track" || !["assigned", "closed"].includes(String(homework.status))) {
      return studentHomeworkUnavailableFailure();
    }
    const freeze = parseGradedTrackFreezeDocument(payload.document);
    const document = freeze?.collectionDocument;
    if (!document) return { ok: false, error: "This homework has no collection activities." };

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return studentHomeworkServiceUnavailableFailure();
    if (!((memberships ?? []) as Array<{ class_id: string }>).some((row) => row.class_id === homework.class_id)) {
      return studentHomeworkForbiddenFailure();
    }
    const targets = Array.isArray(homework.target_student_ids)
      ? homework.target_student_ids.filter((id): id is string => typeof id === "string")
      : null;
    if (targets && !targets.includes(user.id)) {
      return studentHomeworkForbiddenFailure();
    }

    const content = scoreHomeworkCollectionAttempt(document, input.responses);
    if (input.submit && !homeworkCollectionRequiredPartsComplete(document, content)) {
      return { ok: false, error: "Complete every required activity before submitting." };
    }
    const totals = homeworkCollectionAttemptTotals(content);
    if (input.submit) {
      const { data, error } = await supabase.rpc(
        "finalize_homework_collection_attempt",
        {
          p_homework_id: homeworkId,
          p_content: content,
          p_auto_score: totals.autoScore,
          p_auto_max_score: totals.autoMaxScore,
          p_manual_max_score: totals.manualMaxScore,
          p_item_count: totals.itemCount,
        },
      );
      if (error) return { ok: false, error: error.message };
      const result = data as { attempt?: unknown; receipt?: unknown } | null;
      const receipt = parseHomeworkFinalizationReceipt(result?.receipt);
      if (!receipt || !result?.attempt) {
        return { ok: false, error: "Homework was saved but its completion receipt was invalid." };
      }
      const attempt = homeworkCollectionAttemptFromRow(result.attempt as Record<string, unknown>);
      revalidatePath("/primary");
      revalidatePath("/secondary");
      revalidatePath(`/primary/homework/${homeworkId}`);
      revalidatePath(`/secondary/homework/${homeworkId}`);
      revalidatePath(`/teacher/classes/${String(homework.class_id)}`);
      revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-collection-results/${homeworkId}`);
      return {
        ok: true,
        attempt,
        receipt,
        ...(receipt.rewardReceipt ? { rewardReceipt: receipt.rewardReceipt } : {}),
      };
    }

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
          status: "in_progress",
          content,
          auto_score: totals.autoScore,
          auto_max_score: totals.autoMaxScore,
          manual_max_score: totals.manualMaxScore,
          submitted_at: null,
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

    revalidatePath("/primary");
    revalidatePath("/secondary");
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/secondary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-collection-results/${homeworkId}`);
    return {
      ok: true,
      attempt: homeworkCollectionAttemptFromRow(saved as Record<string, unknown>),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save this homework.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { isStudent } from "@/lib/auth/roles";
import {
  assessmentProgress,
  listAssessmentParts,
  sanitizeAssessmentResponses,
  type AssessmentAttempt,
} from "@/lib/assessment";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { resolveHomeworkAssessmentDefinition } from "@/lib/class-homework/resolve-assessment-definition";
import { createClient } from "@/lib/supabase/server";

export type SaveAssessmentAttemptResult =
  | { ok: true; attempt: AssessmentAttempt }
  | { ok: false; error: string };

export async function savePrimaryA2AssessmentAttempt(input: {
  homeworkId: string;
  activePartId: string;
  responses: unknown;
  submit?: boolean;
}): Promise<SaveAssessmentAttemptResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) {
      return { ok: false, error: "Student authentication required." };
    }

    const homeworkId = input.homeworkId.trim();
    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, payload")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homeworkError || !homework) {
      return { ok: false, error: homeworkError?.message ?? "Assessment not found." };
    }
    const payload = normalizeHomeworkPayload(homework.payload);
    if (!payload || payload.type !== "primary_a2_assessment") {
      return { ok: false, error: "This homework is not an assessment." };
    }
    if (homework.status !== "assigned") {
      return {
        ok: false,
        error:
          homework.status === "closed"
            ? "This assessment is closed."
            : "This assessment is not assigned yet.",
      };
    }

    const definition = resolveHomeworkAssessmentDefinition(payload);

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return { ok: false, error: membershipError.message };
    const enrolled = ((memberships ?? []) as Array<{ class_id: string }>).some(
      (row) => row.class_id === homework.class_id,
    );
    if (!enrolled) return { ok: false, error: "You are not enrolled in this class." };

    const { data: existing, error: existingError } = await supabase
      .from("class_assessment_attempts")
      .select("id, status, started_at")
      .eq("homework_id", homeworkId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (
      existingError &&
      !/class_assessment_attempts|schema cache|does not exist/i.test(existingError.message)
    ) {
      return { ok: false, error: existingError.message };
    }
    if (existing?.status === "submitted") {
      return { ok: false, error: "This assessment has already been submitted." };
    }

    const responses = sanitizeAssessmentResponses(definition, input.responses);
    if (input.submit) {
      const expectedRecordings = listAssessmentParts(definition).flatMap((part) => {
        if (
          !(
            part.kind === "speaking_picture_differences" ||
            part.kind === "speaking_question_exchange" ||
            part.kind === "speaking_picture_story"
          )
        ) {
          return [];
        }
        const responseId = part.activity.responseId;
        const recordingId = responses[part.id]?.[responseId];
        return recordingId ? [{ id: recordingId, partId: part.id, responseId }] : [];
      });
      if (expectedRecordings.length) {
        const { data: recordingRows, error: recordingsError } = await supabase
          .from("assessment_speaking_recordings")
          .select("id, part_id, response_id")
          .eq("homework_id", homeworkId)
          .eq("student_id", user.id)
          .in(
            "id",
            expectedRecordings.map((item) => item.id),
          );
        if (recordingsError) {
          return {
            ok: false,
            error: /assessment_speaking_recordings|schema cache|does not exist/i.test(
              recordingsError.message,
            )
              ? "Speaking submissions are not available until migration 100 is applied."
              : recordingsError.message,
          };
        }
        const valid = new Set(
          (recordingRows ?? []).map(
            (row) => `${row.id}:${row.part_id}:${row.response_id}`,
          ),
        );
        if (
          expectedRecordings.some(
            (item) => !valid.has(`${item.id}:${item.partId}:${item.responseId}`),
          )
        ) {
          return {
            ok: false,
            error:
              "One of the speaking recordings could not be verified. Please record and save that part again.",
          };
        }
      }
    }
    const progress = assessmentProgress(definition, responses);
    const validPartIds = new Set(listAssessmentParts(definition).map((part) => part.id));
    const activePartId = validPartIds.has(input.activePartId)
      ? input.activePartId
      : (listAssessmentParts(definition)[0]?.id ?? "");
    const now = new Date().toISOString();
    const status = input.submit ? "submitted" : "in_progress";
    const startedAt =
      typeof existing?.started_at === "string" ? existing.started_at : now;
    const { data: saved, error: saveError } = await supabase
      .from("class_assessment_attempts")
      .upsert(
        {
          homework_id: homeworkId,
          student_id: user.id,
          definition_id: definition.id,
          content_version: definition.contentVersion,
          status,
          active_part_id: activePartId,
          responses,
          answered_count: progress.answered,
          objective_correct: progress.correct,
          objective_total: progress.objectiveTotal,
          started_at: startedAt,
          submitted_at: input.submit ? now : null,
          updated_at: now,
        },
        { onConflict: "homework_id,student_id" },
      )
      .select("id, status, active_part_id, responses, started_at, updated_at, submitted_at")
      .single();
    if (saveError || !saved) {
      return {
        ok: false,
        error: /class_assessment_attempts|schema cache|does not exist/i.test(
          saveError?.message ?? "",
        )
          ? "Assessment saving is not available until migration 099 is applied."
          : (saveError?.message ?? "Could not save the assessment."),
      };
    }

    if (input.submit) {
      await supabase.from("class_homework_completions").upsert(
        {
          homework_id: homeworkId,
          student_id: user.id,
          finished_at: now,
          questions_total: progress.objectiveTotal,
          correct_count: progress.correct,
          updated_at: now,
        },
        { onConflict: "homework_id,student_id" },
      );
    }
    revalidatePath("/primary");
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}`);

    return {
      ok: true,
      attempt: {
        schemaVersion: 1,
        attemptId: String(saved.id),
        definitionId: definition.id,
        contentVersion: definition.contentVersion,
        status: saved.status === "submitted" ? "submitted" : "in_progress",
        activePartId: String(saved.active_part_id),
        responses: sanitizeAssessmentResponses(definition, saved.responses),
        startedAt: typeof saved.started_at === "string" ? saved.started_at : startedAt,
        updatedAt: typeof saved.updated_at === "string" ? saved.updated_at : now,
        submittedAt: typeof saved.submitted_at === "string" ? saved.submitted_at : null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the assessment.",
    };
  }
}

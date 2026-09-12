"use server";

import { revalidatePath } from "next/cache";
import type { StudentActionAuthFailure } from "@/lib/auth/student-action-auth";
import { resolveStudentActionSession } from "@/lib/auth/student-action-auth-server";
import {
  studentHomeworkForbiddenFailure,
  studentHomeworkServiceUnavailableFailure,
  studentHomeworkUnavailableFailure,
} from "@/lib/auth/student-homework-access";
import {
  countWritingWords,
  normalizeHomeworkPayload,
  normalizeWritingSubmissionText,
} from "@/lib/class-homework/normalize";
import { recordWritingPromptHomeworkCompletion } from "@/lib/actions/class-homework";

type SaveHomeworkWritingSubmissionResult =
  | { ok: true; status: "in_progress" | "submitted" }
  | { ok: false; error: string }
  | StudentActionAuthFailure;

export async function saveHomeworkWritingSubmission(input: {
  homeworkId: string;
  text: string;
  submit?: boolean;
}): Promise<SaveHomeworkWritingSubmissionResult> {
  try {
    const homeworkId = input.homeworkId.trim();
    const auth = await resolveStudentActionSession({
      nextPath: homeworkId
        ? `/homework/${encodeURIComponent(homeworkId)}`
        : "/",
    });
    if (!auth.ok) return auth;
    const { supabase, user } = auth;
    const text = normalizeWritingSubmissionText(input.text);
    if (!text) return { ok: false, error: "Write something before saving." };

    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, payload, target_student_ids")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homeworkError) return studentHomeworkServiceUnavailableFailure();
    const payload = normalizeHomeworkPayload(homework?.payload);
    if (
      !homework ||
      !payload ||
      payload.type !== "writing_prompt" ||
      !["assigned", "closed"].includes(String(homework.status))
    ) {
      return studentHomeworkUnavailableFailure();
    }

    if (input.submit && payload.minWords) {
      const words = countWritingWords(text);
      if (words < payload.minWords) {
        return {
          ok: false,
          error: `Write at least ${payload.minWords} word${payload.minWords === 1 ? "" : "s"} before submitting (${words}/${payload.minWords}).`,
        };
      }
    }

    const targets = Array.isArray(homework.target_student_ids)
      ? homework.target_student_ids.filter((id): id is string => typeof id === "string")
      : null;
    if (targets && !targets.includes(user.id)) {
      return studentHomeworkForbiddenFailure();
    }

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return studentHomeworkServiceUnavailableFailure();
    if (
      !((memberships ?? []) as Array<{ class_id: string }>).some(
        (row) => row.class_id === homework.class_id,
      )
    ) {
      return studentHomeworkForbiddenFailure();
    }

    const { data: existing, error: existingError } = await supabase
      .from("homework_writing_submissions")
      .select("status")
      .eq("homework_id", homeworkId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (
      existingError &&
      /homework_writing_submissions|schema cache|does not exist/i.test(existingError.message)
    ) {
      return { ok: false, error: "Writing submissions require migration 123." };
    }
    if (existingError) return { ok: false, error: existingError.message };
    if (existing?.status === "submitted" && !input.submit) {
      return { ok: true, status: "submitted" };
    }

    const now = new Date().toISOString();
    const status = input.submit ? "submitted" : "in_progress";
    const { error } = await supabase.from("homework_writing_submissions").upsert(
      {
        homework_id: homeworkId,
        student_id: user.id,
        status,
        text,
        submitted_at: input.submit ? now : null,
        updated_at: now,
      },
      { onConflict: "homework_id,student_id" },
    );
    if (error) {
      return {
        ok: false,
        error: /homework_writing_submissions|schema cache|does not exist/i.test(error.message)
          ? "Writing submissions require migration 123."
          : error.message,
      };
    }

    if (input.submit) {
      const completion = await recordWritingPromptHomeworkCompletion({ homeworkId });
      if (!completion.ok) {
        return { ok: false, error: completion.error };
      }
    }

    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/secondary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}/homework-writing-results/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}`);

    return { ok: true, status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your writing.",
    };
  }
}

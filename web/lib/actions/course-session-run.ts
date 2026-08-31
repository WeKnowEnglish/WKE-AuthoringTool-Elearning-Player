"use server";

import { isStudent } from "@/lib/auth/roles";
import {
  GRADE_4_SESSION_1_RUN,
  normalizeCourseSessionRunRow,
  normalizeSession1HotspotProgress,
  normalizeSession1PracticeProgress,
  normalizeSession1RunState,
  type CourseSessionRunPhase,
  type CourseSessionRunRecord,
  type CourseSessionRunStatus,
} from "@/lib/curriculum/session-run";
import { createClient } from "@/lib/supabase/server";

type SaveCourseSessionRunInput = {
  phase: CourseSessionRunPhase;
  status?: CourseSessionRunStatus;
  activeStepId?: string;
  progress: unknown;
};

export type SaveCourseSessionRunResult =
  | { ok: true; run: CourseSessionRunRecord }
  | { ok: false; error: string };

export async function saveMyGrade4Session1Run(
  input: SaveCourseSessionRunInput,
): Promise<SaveCourseSessionRunResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) {
      return { ok: false, error: "Student authentication required." };
    }

    const { data: existing, error: existingError } = await supabase
      .from("student_course_session_runs")
      .select("state, status, started_at, completed_at")
      .eq("student_id", user.id)
      .eq("course_id", GRADE_4_SESSION_1_RUN.courseId)
      .eq("unit_id", GRADE_4_SESSION_1_RUN.unitId)
      .eq("session_id", GRADE_4_SESSION_1_RUN.sessionId)
      .maybeSingle();
    if (existingError && !/student_course_session_runs|schema cache|does not exist/i.test(existingError.message)) {
      return { ok: false, error: existingError.message };
    }

    const state = normalizeSession1RunState(existing?.state);
    if (input.phase === "hotspot") {
      state.hotspot = normalizeSession1HotspotProgress(input.progress);
    } else {
      state.practice = normalizeSession1PracticeProgress(input.progress);
    }

    const serialized = JSON.stringify(state);
    if (serialized.length > 30000) {
      return { ok: false, error: "Session progress is too large to save." };
    }

    const now = new Date().toISOString();
    const status =
      existing?.status === "completed" || input.status === "completed"
        ? "completed"
        : "in_progress";
    const { data, error } = await supabase
      .from("student_course_session_runs")
      .upsert(
        {
          student_id: user.id,
          course_id: GRADE_4_SESSION_1_RUN.courseId,
          unit_id: GRADE_4_SESSION_1_RUN.unitId,
          session_id: GRADE_4_SESSION_1_RUN.sessionId,
          content_version: GRADE_4_SESSION_1_RUN.contentVersion,
          status,
          active_phase: input.phase,
          active_step_id: typeof input.activeStepId === "string" ? input.activeStepId.trim().slice(0, 120) : "",
          state,
          started_at: typeof existing?.started_at === "string" ? existing.started_at : now,
          completed_at:
            status === "completed"
              ? typeof existing?.completed_at === "string"
                ? existing.completed_at
                : now
              : null,
          updated_at: now,
        },
        { onConflict: "student_id,course_id,unit_id,session_id" },
      )
      .select("id, student_id, course_id, unit_id, session_id, content_version, status, active_phase, active_step_id, state, started_at, completed_at, updated_at")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error && /student_course_session_runs|schema cache|does not exist/i.test(error.message)
          ? "Session progress requires migration 141."
          : error?.message ?? "Could not save session progress.",
      };
    }
    return { ok: true, run: normalizeCourseSessionRunRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save session progress.",
    };
  }
}

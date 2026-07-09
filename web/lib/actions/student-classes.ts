"use server";

import { createClient } from "@/lib/supabase/server";
import { joinCodeValidationError, normalizeJoinCode } from "@/lib/teacher-classes/join-code";

export type JoinClassResult =
  | { ok: true; classId: string; title: string }
  | { ok: false; error: string };

const JOIN_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Please sign in as a student first.",
  students_only: "Only student accounts can join a class.",
  invalid_code: "That class code is not valid. Check with your teacher.",
};

export async function joinClassByCode(rawCode: string): Promise<JoinClassResult> {
  const validationError = joinCodeValidationError(rawCode);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: JOIN_ERROR_MESSAGES.not_authenticated };
  }
  if (user.app_metadata?.role !== "student") {
    return { ok: false, error: JOIN_ERROR_MESSAGES.students_only };
  }

  const { data, error } = await supabase.rpc("join_class_by_code", {
    p_join_code: normalizeJoinCode(rawCode),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    classId?: string;
    title?: string;
  };

  if (!payload?.ok) {
    const key = payload?.error ?? "invalid_code";
    return { ok: false, error: JOIN_ERROR_MESSAGES[key] ?? JOIN_ERROR_MESSAGES.invalid_code };
  }

  if (!payload.classId || !payload.title) {
    return { ok: false, error: JOIN_ERROR_MESSAGES.invalid_code };
  }

  return { ok: true, classId: payload.classId, title: payload.title };
}

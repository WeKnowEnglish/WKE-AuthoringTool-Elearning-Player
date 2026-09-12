import "server-only";

import type { User } from "@supabase/supabase-js";
import {
  classifyStudentActionAuth,
  STUDENT_SESSION_UNAVAILABLE_MESSAGE,
  type StudentActionAuthFailure,
} from "@/lib/auth/student-action-auth";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentActionSessionResult =
  | {
      ok: true;
      studentId: string;
      user: User;
      supabase: SupabaseServerClient;
    }
  | StudentActionAuthFailure;

export async function resolveStudentActionSession(input?: {
  nextPath?: string | null;
}): Promise<StudentActionSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    const result = classifyStudentActionAuth({
      user,
      error,
      nextPath: input?.nextPath,
    });
    return result.ok ? { ...result, supabase } : result;
  } catch {
    return {
      ok: false,
      error: STUDENT_SESSION_UNAVAILABLE_MESSAGE,
      errorCode: "student_session_unavailable",
      recovery: "retry",
    };
  }
}

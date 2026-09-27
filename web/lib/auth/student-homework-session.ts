import type { StudentActionSessionResult } from "@/lib/auth/student-action-auth-server";

/** Verified server-only session context that can be reused by homework data reads. */
export type StudentHomeworkSession = Extract<
  StudentActionSessionResult,
  { ok: true }
>;

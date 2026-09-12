import "server-only";

import { redirect } from "next/navigation";

import {
  resolveStudentActionSession,
  type StudentActionSessionResult,
} from "@/lib/auth/student-action-auth-server";

/**
 * Applies the same student-session decision to protected pages that homework
 * Server Actions use. Retryable identity-provider failures are returned so the
 * page can render a non-destructive retry state; missing sessions and wrong
 * roles use the classifier's safe local recovery path.
 */
export async function resolveStudentRouteSession(
  nextPath: string,
): Promise<StudentActionSessionResult> {
  const result = await resolveStudentActionSession({ nextPath });

  if (!result.ok && result.recovery !== "retry") {
    redirect(result.recoveryPath ?? "/login");
  }

  return result;
}

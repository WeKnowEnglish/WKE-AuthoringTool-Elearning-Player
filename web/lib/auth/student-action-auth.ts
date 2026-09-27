import { isStudent } from "@/lib/auth/roles";

export type StudentActionAuthErrorCode =
  | "student_session_required"
  | "student_role_required"
  | "student_session_unavailable"
  | "student_homework_forbidden"
  | "student_homework_unavailable"
  | "student_homework_service_unavailable";

export type StudentActionAuthFailure = {
  ok: false;
  error: string;
  errorCode: StudentActionAuthErrorCode;
  recovery: "sign_in" | "use_student_account" | "retry" | "return_home";
  recoveryPath?: string;
};

export type StudentSessionUserLike = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  email?: string | null;
};

type AuthCheckErrorLike = {
  code?: string | null;
  name?: string | null;
  status?: number | null;
};

const SESSION_REQUIRED_ERROR_CODES = new Set([
  "bad_jwt",
  "no_authorization",
  "refresh_token_already_used",
  "refresh_token_not_found",
  "session_expired",
  "session_not_found",
]);

const SESSION_REQUIRED_ERROR_NAMES = new Set([
  "AuthSessionMissingError",
  "AuthInvalidTokenResponseError",
]);

export const STUDENT_SESSION_REQUIRED_MESSAGE =
  "Your sign-in has ended. Sign in again to keep working.";
export const STUDENT_ROLE_REQUIRED_MESSAGE =
  "This homework needs a student account. Ask a teacher or parent for your student sign-in details.";
export const STUDENT_SESSION_UNAVAILABLE_MESSAGE =
  "We couldn’t check your sign-in right now. Try again in a moment.";

function authErrorNeedsSignIn(error: AuthCheckErrorLike): boolean {
  const code = error.code?.trim().toLowerCase() ?? "";
  const name = error.name?.trim() ?? "";
  return (
    error.status === 401 ||
    error.status === 403 ||
    SESSION_REQUIRED_ERROR_CODES.has(code) ||
    SESSION_REQUIRED_ERROR_NAMES.has(name)
  );
}

export function studentSignInRecoveryPath(nextPath?: string | null): string {
  const next = nextPath?.trim() ?? "";
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/login?portal=student";
  }
  return `/login?portal=student&next=${encodeURIComponent(next)}`;
}

export function classifyStudentActionAuth<TUser extends StudentSessionUserLike>(input: {
  user: TUser | null;
  error?: AuthCheckErrorLike | null;
  nextPath?: string | null;
}): { ok: true; studentId: string; user: TUser } | StudentActionAuthFailure {
  if (input.user?.id && isStudent(input.user)) {
    return { ok: true, studentId: input.user.id, user: input.user };
  }

  if (input.user?.id) {
    return {
      ok: false,
      error: STUDENT_ROLE_REQUIRED_MESSAGE,
      errorCode: "student_role_required",
      recovery: "use_student_account",
      recoveryPath: studentSignInRecoveryPath(input.nextPath),
    };
  }

  if (input.error && !authErrorNeedsSignIn(input.error)) {
    return {
      ok: false,
      error: STUDENT_SESSION_UNAVAILABLE_MESSAGE,
      errorCode: "student_session_unavailable",
      recovery: "retry",
    };
  }

  return {
    ok: false,
    error: STUDENT_SESSION_REQUIRED_MESSAGE,
    errorCode: "student_session_required",
    recovery: "sign_in",
    recoveryPath: studentSignInRecoveryPath(input.nextPath),
  };
}

export function isStudentActionAuthFailure(
  value: unknown,
): value is StudentActionAuthFailure {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudentActionAuthFailure>;
  return (
    candidate.ok === false &&
    typeof candidate.error === "string" &&
    (candidate.errorCode === "student_session_required" ||
      candidate.errorCode === "student_role_required" ||
      candidate.errorCode === "student_session_unavailable" ||
      candidate.errorCode === "student_homework_forbidden" ||
      candidate.errorCode === "student_homework_unavailable" ||
      candidate.errorCode === "student_homework_service_unavailable")
  );
}

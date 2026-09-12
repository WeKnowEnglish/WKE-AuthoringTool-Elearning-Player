import type { StudentActionAuthFailure } from "@/lib/auth/student-action-auth";

type HomeworkAccessRow = {
  class_id?: unknown;
  status?: unknown;
  target_student_ids?: unknown;
};

export const STUDENT_HOMEWORK_FORBIDDEN_MESSAGE =
  "This homework was not assigned to this student account.";
export const STUDENT_HOMEWORK_UNAVAILABLE_MESSAGE =
  "This homework is not available right now.";
export const STUDENT_HOMEWORK_SERVICE_UNAVAILABLE_MESSAGE =
  "We couldn’t load this homework right now. Try again in a moment.";

export function studentHomeworkUnavailableFailure(): StudentActionAuthFailure {
  return {
    ok: false,
    error: STUDENT_HOMEWORK_UNAVAILABLE_MESSAGE,
    errorCode: "student_homework_unavailable",
    recovery: "return_home",
  };
}

export function studentHomeworkForbiddenFailure(): StudentActionAuthFailure {
  return {
    ok: false,
    error: STUDENT_HOMEWORK_FORBIDDEN_MESSAGE,
    errorCode: "student_homework_forbidden",
    recovery: "return_home",
  };
}

export function studentHomeworkServiceUnavailableFailure(): StudentActionAuthFailure {
  return {
    ok: false,
    error: STUDENT_HOMEWORK_SERVICE_UNAVAILABLE_MESSAGE,
    errorCode: "student_homework_service_unavailable",
    recovery: "retry",
  };
}

export function classifyStudentHomeworkAccess(input: {
  studentId: string;
  homework: HomeworkAccessRow | null | undefined;
  membershipClassIds: readonly string[];
  allowedStatuses?: readonly string[];
}): { ok: true } | StudentActionAuthFailure {
  const allowedStatuses = input.allowedStatuses ?? ["assigned", "closed"];
  const classId =
    typeof input.homework?.class_id === "string" ? input.homework.class_id : "";
  const status =
    typeof input.homework?.status === "string" ? input.homework.status : "";

  if (!input.homework || !classId || !allowedStatuses.includes(status)) {
    return studentHomeworkUnavailableFailure();
  }

  const targets = Array.isArray(input.homework.target_student_ids)
    ? input.homework.target_student_ids.filter(
        (id): id is string => typeof id === "string",
      )
    : null;
  const enrolled = input.membershipClassIds.includes(classId);
  const targeted = !targets || targets.includes(input.studentId);

  if (!enrolled || !targeted) {
    return studentHomeworkForbiddenFailure();
  }

  return { ok: true };
}

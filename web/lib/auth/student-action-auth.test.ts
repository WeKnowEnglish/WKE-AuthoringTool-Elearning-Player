import { describe, expect, it } from "vitest";
import {
  classifyStudentActionAuth,
  isStudentActionAuthFailure,
  STUDENT_SESSION_REQUIRED_MESSAGE,
  STUDENT_SESSION_UNAVAILABLE_MESSAGE,
  studentSignInRecoveryPath,
} from "@/lib/auth/student-action-auth";

describe("classifyStudentActionAuth", () => {
  it("accepts a verified student and returns only the identity needed by callers", () => {
    const user = {
      id: "student-1",
      email: "student@example.com",
      app_metadata: { role: "student" },
    };

    expect(classifyStudentActionAuth({ user })).toEqual({
      ok: true,
      studentId: "student-1",
      user,
    });
  });

  it("classifies a missing session as sign-in recovery with a safe return path", () => {
    expect(
      classifyStudentActionAuth({
        user: null,
        nextPath: "/homework/homework-1",
      }),
    ).toEqual({
      ok: false,
      error: STUDENT_SESSION_REQUIRED_MESSAGE,
      errorCode: "student_session_required",
      recovery: "sign_in",
      recoveryPath:
        "/login?portal=student&next=%2Fhomework%2Fhomework-1",
    });
  });

  it("treats invalid or expired auth tokens as requiring sign-in", () => {
    const result = classifyStudentActionAuth({
      user: null,
      error: { status: 401, code: "bad_jwt" },
      nextPath: "/homework/homework-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("student_session_required");
      expect(result.recovery).toBe("sign_in");
    }
  });

  it("keeps temporary session-check failures distinct and does not leak provider messages", () => {
    const result = classifyStudentActionAuth({
      user: null,
      error: { status: 503, code: "provider_unavailable" },
    });

    expect(result).toEqual({
      ok: false,
      error: STUDENT_SESSION_UNAVAILABLE_MESSAGE,
      errorCode: "student_session_unavailable",
      recovery: "retry",
    });
    expect(JSON.stringify(result)).not.toContain("provider_unavailable");
  });

  it("distinguishes a signed-in non-student role", () => {
    const result = classifyStudentActionAuth({
      user: {
        id: "teacher-1",
        email: "teacher@example.com",
        app_metadata: { role: "teacher" },
      },
      nextPath: "/homework/homework-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("student_role_required");
      expect(result.recovery).toBe("use_student_account");
      expect(result.recoveryPath).toBe(
        "/login?portal=student&next=%2Fhomework%2Fhomework-1",
      );
    }
  });

  it("recognizes only structured authentication failures", () => {
    expect(
      isStudentActionAuthFailure({
        ok: false,
        error: STUDENT_SESSION_REQUIRED_MESSAGE,
        errorCode: "student_session_required",
        recovery: "sign_in",
      }),
    ).toBe(true);
    expect(isStudentActionAuthFailure({ ok: false, error: "Homework not found." })).toBe(
      false,
    );
    expect(
      isStudentActionAuthFailure({
        ok: false,
        error: "We could not load this homework.",
        errorCode: "student_homework_service_unavailable",
        recovery: "retry",
      }),
    ).toBe(true);
  });
});

describe("studentSignInRecoveryPath", () => {
  it("rejects external and protocol-relative return paths", () => {
    expect(studentSignInRecoveryPath("https://evil.example")).toBe(
      "/login?portal=student",
    );
    expect(studentSignInRecoveryPath("//evil.example")).toBe(
      "/login?portal=student",
    );
  });
});

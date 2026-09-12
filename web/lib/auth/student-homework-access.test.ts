import { describe, expect, it } from "vitest";
import {
  classifyStudentHomeworkAccess,
  STUDENT_HOMEWORK_FORBIDDEN_MESSAGE,
  STUDENT_HOMEWORK_SERVICE_UNAVAILABLE_MESSAGE,
  STUDENT_HOMEWORK_UNAVAILABLE_MESSAGE,
  studentHomeworkServiceUnavailableFailure,
} from "@/lib/auth/student-homework-access";

const homework = {
  class_id: "class-1",
  status: "assigned",
  target_student_ids: null,
};

describe("classifyStudentHomeworkAccess", () => {
  it("returns one child-safe retry result for temporary homework-service failures", () => {
    expect(studentHomeworkServiceUnavailableFailure()).toEqual({
      ok: false,
      error: STUDENT_HOMEWORK_SERVICE_UNAVAILABLE_MESSAGE,
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
  });

  it("accepts an enrolled student for a class-wide assignment", () => {
    expect(
      classifyStudentHomeworkAccess({
        studentId: "student-1",
        homework,
        membershipClassIds: ["class-1"],
      }),
    ).toEqual({ ok: true });
  });

  it("rejects an unenrolled student without exposing class details", () => {
    expect(
      classifyStudentHomeworkAccess({
        studentId: "student-1",
        homework,
        membershipClassIds: [],
      }),
    ).toEqual({
      ok: false,
      error: STUDENT_HOMEWORK_FORBIDDEN_MESSAGE,
      errorCode: "student_homework_forbidden",
      recovery: "return_home",
    });
  });

  it("rejects a student excluded by assignment targeting", () => {
    expect(
      classifyStudentHomeworkAccess({
        studentId: "student-1",
        homework: { ...homework, target_student_ids: ["student-2"] },
        membershipClassIds: ["class-1"],
      }),
    ).toMatchObject({
      ok: false,
      errorCode: "student_homework_forbidden",
    });
  });

  it("classifies missing and unopened homework as unavailable", () => {
    expect(
      classifyStudentHomeworkAccess({
        studentId: "student-1",
        homework: null,
        membershipClassIds: ["class-1"],
      }),
    ).toEqual({
      ok: false,
      error: STUDENT_HOMEWORK_UNAVAILABLE_MESSAGE,
      errorCode: "student_homework_unavailable",
      recovery: "return_home",
    });
    expect(
      classifyStudentHomeworkAccess({
        studentId: "student-1",
        homework: { ...homework, status: "draft" },
        membershipClassIds: ["class-1"],
      }),
    ).toMatchObject({
      ok: false,
      errorCode: "student_homework_unavailable",
    });
  });
});

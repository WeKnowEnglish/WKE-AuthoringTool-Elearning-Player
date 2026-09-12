import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  revalidatePath: vi.fn(),
  recordCompletion: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));
vi.mock("@/lib/auth/student-action-auth-server", () => ({
  resolveStudentActionSession: mocks.resolveSession,
}));
vi.mock("@/lib/actions/class-homework", () => ({
  recordWritingPromptHomeworkCompletion: mocks.recordCompletion,
}));

import { saveHomeworkWritingSubmission } from "@/lib/actions/homework-writing-submission";

const student = {
  id: "student-1",
  app_metadata: { role: "student" },
};

function homeworkRow(overrides?: Record<string, unknown>) {
  return {
    id: "homework-1",
    class_id: "class-1",
    status: "assigned",
    payload: {
      type: "writing_prompt",
      prompt: "Describe your weekend.",
      minWords: 0,
    },
    target_student_ids: null,
    ...overrides,
  };
}

function createSupabase(input: {
  homework?: Record<string, unknown> | null;
  homeworkError?: { message: string } | null;
  membershipClassIds?: string[];
  membershipError?: { message: string } | null;
}) {
  const submissionUpsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "class_homework") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: input.homework ?? null,
              error: input.homeworkError ?? null,
            }),
          }),
        }),
      };
    }
    if (table === "homework_writing_submissions") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        upsert: submissionUpsert,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  const supabase = {
    from,
    rpc: vi.fn().mockResolvedValue({
      data: (input.membershipClassIds ?? []).map((classId) => ({
        class_id: classId,
      })),
      error: input.membershipError ?? null,
    }),
  };
  return { supabase, submissionUpsert };
}

describe("saveHomeworkWritingSubmission authorization integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the structured absent-session result before any data access", async () => {
    mocks.resolveSession.mockResolvedValue({
      ok: false,
      error: "Your sign-in has ended. Sign in again to keep working.",
      errorCode: "student_session_required",
      recovery: "sign_in",
      recoveryPath:
        "/login?portal=student&next=%2Fhomework%2Fhomework-1",
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "student_session_required",
    });
  });

  it("does not write for an untargeted student", async () => {
    const { supabase, submissionUpsert } = createSupabase({
      homework: homeworkRow({ target_student_ids: ["student-2"] }),
      membershipClassIds: ["class-1"],
    });
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      studentId: student.id,
      user: student,
      supabase,
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "student_homework_forbidden",
    });
    expect(submissionUpsert).not.toHaveBeenCalled();
  });

  it("does not write for a student outside the class", async () => {
    const { supabase, submissionUpsert } = createSupabase({
      homework: homeworkRow(),
      membershipClassIds: [],
    });
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      studentId: student.id,
      user: student,
      supabase,
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "student_homework_forbidden",
    });
    expect(submissionUpsert).not.toHaveBeenCalled();
  });

  it("classifies a homework lookup failure without exposing the provider message", async () => {
    const { supabase, submissionUpsert } = createSupabase({
      homeworkError: { message: "relation class_homework leaked_internal_name" },
    });
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      studentId: student.id,
      user: student,
      supabase,
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
    expect(result.error).not.toContain("leaked_internal_name");
    expect(submissionUpsert).not.toHaveBeenCalled();
  });

  it("classifies an enrollment lookup failure without exposing the provider message", async () => {
    const { supabase, submissionUpsert } = createSupabase({
      homework: homeworkRow(),
      membershipError: { message: "rpc student_class_memberships leaked_internal_name" },
    });
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      studentId: student.id,
      user: student,
      supabase,
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
    expect(result.error).not.toContain("leaked_internal_name");
    expect(submissionUpsert).not.toHaveBeenCalled();
  });

  it("writes a draft for the verified enrolled and targeted student only", async () => {
    const { supabase, submissionUpsert } = createSupabase({
      homework: homeworkRow({ target_student_ids: [student.id] }),
      membershipClassIds: ["class-1"],
    });
    mocks.resolveSession.mockResolvedValue({
      ok: true,
      studentId: student.id,
      user: student,
      supabase,
    });

    const result = await saveHomeworkWritingSubmission({
      homeworkId: "homework-1",
      text: "My draft",
    });

    expect(result).toEqual({ ok: true, status: "in_progress" });
    expect(submissionUpsert).toHaveBeenCalledTimes(1);
    expect(submissionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        homework_id: "homework-1",
        student_id: "student-1",
        text: "My draft",
      }),
      { onConflict: "homework_id,student_id" },
    );
  });
});

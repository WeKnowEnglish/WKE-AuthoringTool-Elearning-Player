import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_noStore: vi.fn(),
}));

import { getHomeworkForStudent } from "@/lib/data/class-homework";

const user = {
  id: "student-1",
  app_metadata: { role: "student" },
};

function homeworkRow() {
  return {
    id: "homework-1",
    class_id: "class-1",
    teacher_id: "teacher-1",
    title: "Writing",
    instructions: "",
    due_at: null,
    status: "assigned",
    payload: {
      type: "writing_prompt",
      prompt: "Describe your weekend.",
      minWords: 0,
    },
    assigned_at: "2026-09-12T00:00:00.000Z",
    created_at: "2026-09-12T00:00:00.000Z",
    updated_at: "2026-09-12T00:00:00.000Z",
    target_student_ids: [user.id],
  };
}

function verifiedSession(input: {
  homework?: Record<string, unknown> | null;
  homeworkError?: { message: string } | null;
  membershipError?: { message: string } | null;
  completionError?: { message: string } | null;
}) {
  const supabase = {
    from: vi.fn((table: string) => {
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
      if (table === "class_homework_completions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: null,
                  error: input.completionError ?? null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error("Unexpected protected read");
    }),
    rpc: vi.fn().mockResolvedValue({
      data: [{ class_id: "class-1", title: "Class 1" }],
      error: input.membershipError ?? null,
    }),
  };

  return {
    ok: true as const,
    studentId: user.id,
    user,
    supabase,
  };
}

describe("getHomeworkForStudent structured load failures", () => {
  it("returns a retryable safe result for a homework query failure", async () => {
    const result = await getHomeworkForStudent(
      "homework-1",
      verifiedSession({
        homeworkError: { message: "database provider_internal_detail" },
      }) as never,
    );

    expect(result).toEqual({
      ok: false,
      error: "We couldn’t load this homework right now. Try again in a moment.",
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
    expect(JSON.stringify(result)).not.toContain("provider_internal_detail");
  });

  it("returns a retryable safe result for an enrollment query failure", async () => {
    const result = await getHomeworkForStudent(
      "homework-1",
      verifiedSession({
        homework: homeworkRow(),
        membershipError: { message: "rpc provider_internal_detail" },
      }) as never,
    );

    expect(result).toEqual({
      ok: false,
      error: "We couldn’t load this homework right now. Try again in a moment.",
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
    expect(JSON.stringify(result)).not.toContain("provider_internal_detail");
  });

  it("keeps a missing or RLS-hidden assignment indistinguishable", async () => {
    const result = await getHomeworkForStudent(
      "homework-1",
      verifiedSession({ homework: null }) as never,
    );

    expect(result).toEqual({
      ok: false,
      error: "This homework is not available right now.",
      errorCode: "student_homework_unavailable",
      recovery: "return_home",
    });
  });

  it("preserves a normal enrolled and targeted homework load", async () => {
    const result = await getHomeworkForStudent(
      "homework-1",
      verifiedSession({ homework: homeworkRow() }) as never,
    );

    expect(result).toMatchObject({
      ok: true,
      homework: {
        id: "homework-1",
        classId: "class-1",
        classTitle: "Class 1",
      },
      quizQuestions: null,
    });
  });

  it("classifies a completion read failure without exposing its provider message", async () => {
    const result = await getHomeworkForStudent(
      "homework-1",
      verifiedSession({
        homework: homeworkRow(),
        completionError: { message: "completion provider_internal_detail" },
      }) as never,
    );

    expect(result).toEqual({
      ok: false,
      error: "We couldn’t load this homework right now. Try again in a moment.",
      errorCode: "student_homework_service_unavailable",
      recovery: "retry",
    });
    expect(JSON.stringify(result)).not.toContain("provider_internal_detail");
  });
});

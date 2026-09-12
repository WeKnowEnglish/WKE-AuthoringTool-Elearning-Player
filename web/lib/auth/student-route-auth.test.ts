import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  resolveStudentActionSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mocks.redirect(path);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/auth/student-action-auth-server", () => ({
  resolveStudentActionSession: mocks.resolveStudentActionSession,
}));

import { resolveStudentRouteSession } from "@/lib/auth/student-route-auth";

describe("resolveStudentRouteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a wrong-role account to student sign-in with the exact return path", async () => {
    const recoveryPath =
      "/login?portal=student&next=%2Fhomework%2Fhomework-1";
    mocks.resolveStudentActionSession.mockResolvedValue({
      ok: false,
      error: "This homework needs a student account.",
      errorCode: "student_role_required",
      recovery: "use_student_account",
      recoveryPath,
    });

    await expect(
      resolveStudentRouteSession("/homework/homework-1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.resolveStudentActionSession).toHaveBeenCalledWith({
      nextPath: "/homework/homework-1",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(recoveryPath);
  });

  it("redirects a missing session through its safe sign-in recovery path", async () => {
    const recoveryPath =
      "/login?portal=student&next=%2Fprimary%2Fhomework%2Fhomework-1";
    mocks.resolveStudentActionSession.mockResolvedValue({
      ok: false,
      error: "Your sign-in has ended.",
      errorCode: "student_session_required",
      recovery: "sign_in",
      recoveryPath,
    });

    await expect(
      resolveStudentRouteSession("/primary/homework/homework-1"),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(recoveryPath);
  });

  it("returns a retryable session failure without redirecting", async () => {
    const failure = {
      ok: false as const,
      error: "We could not check your sign-in right now.",
      errorCode: "student_session_unavailable" as const,
      recovery: "retry" as const,
    };
    mocks.resolveStudentActionSession.mockResolvedValue(failure);

    await expect(
      resolveStudentRouteSession("/secondary/homework/homework-1"),
    ).resolves.toEqual(failure);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

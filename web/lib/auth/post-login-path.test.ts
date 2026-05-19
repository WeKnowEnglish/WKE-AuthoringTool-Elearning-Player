import { describe, expect, it } from "vitest";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";

describe("resolvePostLoginPath", () => {
  it("sends teachers to teacher area by default", () => {
    expect(resolvePostLoginPath({ role: "teacher" })).toBe("/teacher/courses");
  });

  it("sends students to home by default", () => {
    expect(resolvePostLoginPath({ role: "student" })).toBe("/home");
  });

  it("honors safe teacher next paths", () => {
    expect(
      resolvePostLoginPath({
        role: "teacher",
        next: "/teacher/media",
      }),
    ).toBe("/teacher/media");
  });

  it("blocks students from teacher next paths", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        next: "/teacher/courses",
      }),
    ).toBe("/home");
  });
});

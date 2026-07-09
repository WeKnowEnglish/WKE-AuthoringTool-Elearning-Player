import { describe, expect, it } from "vitest";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";

describe("resolvePostLoginPath", () => {
  it("sends teachers to teacher area by default", () => {
    expect(resolvePostLoginPath({ role: "teacher" })).toBe("/teacher/classes");
  });

  it("sends students to home by default", () => {
    expect(resolvePostLoginPath({ role: "student" })).toBe("/home");
  });

  it("sends Secondary-track students to secondary by default", () => {
    expect(resolvePostLoginPath({ role: "student", learningBand: "a2" })).toBe(
      "/secondary",
    );
  });

  it("sends Primary-track students to home by default", () => {
    expect(resolvePostLoginPath({ role: "student", learningBand: "a1" })).toBe("/home");
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
        next: "/teacher/classes",
      }),
    ).toBe("/home");
  });

  it("keeps student non-teacher next paths when provided", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        learningBand: "a2",
        next: "/home?collection=games",
      }),
    ).toBe("/home?collection=games");
  });
});

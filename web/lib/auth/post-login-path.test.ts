import { describe, expect, it } from "vitest";
import { resolveLandingRedirectPath, resolvePostLoginPath } from "@/lib/auth/post-login-path";

describe("resolvePostLoginPath", () => {
  it("sends teachers to teacher area by default", () => {
    expect(resolvePostLoginPath({ role: "teacher" })).toBe("/teacher/classes");
  });

  it("sends teachers with password induction to set-password", () => {
    expect(
      resolvePostLoginPath({
        role: "teacher",
        mustChangePassword: true,
        next: "/teacher/media",
      }),
    ).toBe("/teacher/set-password");
  });

  it("sends students to primary dashboard by default", () => {
    expect(resolvePostLoginPath({ role: "student" })).toBe("/primary");
  });

  it("sends Secondary-track students to secondary by default", () => {
    expect(resolvePostLoginPath({ role: "student", learningBand: "a2" })).toBe(
      "/secondary",
    );
  });

  it("sends Primary-track students to primary dashboard by default", () => {
    expect(resolvePostLoginPath({ role: "student", learningBand: "a1" })).toBe(
      "/primary",
    );
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
    ).toBe("/primary");
  });

  it("blocks students from the Live Game host route", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        next: "/live-game/host",
      }),
    ).toBe("/primary");
  });

  it("returns teachers to the Live Game host route after sign-in", () => {
    expect(
      resolvePostLoginPath({
        role: "teacher",
        next: "/live-game/host",
      }),
    ).toBe("/live-game/host");
  });

  it("maps legacy /home student next paths onto Primary", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        learningBand: "a2",
        next: "/home?collection=games",
      }),
    ).toBe("/primary?nav=games");
  });

  it("blocks student login doors used as next paths", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        learningBand: "a1",
        next: "/primary/login",
      }),
    ).toBe("/primary");
    expect(
      resolvePostLoginPath({
        role: "student",
        learningBand: "a2",
        next: "/secondary/login",
      }),
    ).toBe("/secondary");
  });

  it("allows deep links into the primary dashboard", () => {
    expect(
      resolvePostLoginPath({
        role: "student",
        learningBand: "a1",
        next: "/primary?nav=vocabulary",
      }),
    ).toBe("/primary?nav=vocabulary");
  });
});

describe("resolveLandingRedirectPath", () => {
  it("sends induction teachers to set-password", () => {
    expect(
      resolveLandingRedirectPath({
        email: "t@school.com",
        app_metadata: { role: "teacher", must_change_password: true },
      }),
    ).toBe("/teacher/set-password");
  });

  it("sends normal teachers to classes", () => {
    expect(
      resolveLandingRedirectPath({
        email: "t@school.com",
        app_metadata: { role: "teacher" },
      }),
    ).toBe("/teacher/classes");
  });
});

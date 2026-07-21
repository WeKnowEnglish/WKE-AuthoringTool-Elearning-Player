import { describe, expect, it } from "vitest";
import {
  canHostLive,
  getTeacherTier,
  isAdmin,
  isCurriculumReviewer,
  isTeacher,
  isTeacherLight,
  isTeacherPlus,
  mustChangePassword,
} from "@/lib/auth/roles";

describe("isAdmin", () => {
  it("is false for ordinary teachers", () => {
    expect(
      isAdmin({
        email: "new.teacher@school.com",
        app_metadata: { role: "teacher" },
      }),
    ).toBe(false);
  });

  it("is true when app_metadata.admin is set", () => {
    expect(
      isAdmin({
        email: "new.teacher@school.com",
        app_metadata: { role: "teacher", admin: true },
      }),
    ).toBe(true);
  });

  it("is true for the bootstrap developer email even without admin flag", () => {
    expect(
      isAdmin({
        email: "bradydmyers@gmail.com",
        app_metadata: { role: "teacher" },
      }),
    ).toBe(true);
  });

  it("requires teacher role", () => {
    expect(
      isAdmin({
        email: "student@school.com",
        app_metadata: { role: "student", admin: true },
      }),
    ).toBe(false);
  });

  it("matches curriculum reviewer gate", () => {
    const teacher = { email: "x@y.com", app_metadata: { role: "teacher" as const } };
    expect(isTeacher(teacher)).toBe(true);
    expect(isCurriculumReviewer(teacher)).toBe(isAdmin(teacher));
  });
});

describe("teacher tier", () => {
  it("defaults unset tier to plus for existing teachers", () => {
    const teacher = { email: "t@school.com", app_metadata: { role: "teacher" } };
    expect(getTeacherTier(teacher)).toBe("plus");
    expect(isTeacherPlus(teacher)).toBe(true);
    expect(isTeacherLight(teacher)).toBe(false);
    expect(canHostLive(teacher)).toBe(true);
  });

  it("reads light tier and blocks live hosting", () => {
    const teacher = {
      email: "light@school.com",
      app_metadata: { role: "teacher", teacher_tier: "light" },
    };
    expect(getTeacherTier(teacher)).toBe("light");
    expect(isTeacherLight(teacher)).toBe(true);
    expect(canHostLive(teacher)).toBe(false);
  });

  it("returns null tier helpers for non-teachers", () => {
    const student = { email: "s@school.com", app_metadata: { role: "student" } };
    expect(getTeacherTier(student)).toBeNull();
    expect(canHostLive(student)).toBe(false);
    expect(mustChangePassword(student)).toBe(false);
  });

  it("reads must_change_password induction flag", () => {
    expect(
      mustChangePassword({
        email: "t@school.com",
        app_metadata: { role: "teacher", must_change_password: true },
      }),
    ).toBe(true);
    expect(
      mustChangePassword({
        email: "t@school.com",
        app_metadata: { role: "teacher", must_change_password: false },
      }),
    ).toBe(false);
  });
});

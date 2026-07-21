import { describe, expect, it } from "vitest";
import { buildTeacherWelcomeEmail } from "@/lib/email/teacher-welcome";

describe("buildTeacherWelcomeEmail", () => {
  it("includes light membership copy and credentials", () => {
    const { subject, text } = buildTeacherWelcomeEmail({
      fullName: "Thảo",
      email: "teacher@example.com",
      tier: "light",
      tempPassword: "00000000",
    });
    expect(subject).toContain("Teacher Light");
    expect(text).toContain("Hi Thảo");
    expect(text).toContain("teacher@example.com");
    expect(text).toContain("00000000");
    expect(text).toContain("Teacher Light");
    expect(text).toContain("/login?portal=teacher");
    expect(text).toContain("choose a new password");
  });

  it("includes plus membership copy", () => {
    const { subject, text } = buildTeacherWelcomeEmail({
      fullName: "Alex",
      email: "plus@example.com",
      tier: "plus",
      tempPassword: "00000000",
    });
    expect(subject).toContain("Teacher Plus");
    expect(text).toContain("Teacher Plus");
    expect(text).toContain("Virtual Classroom");
  });
});

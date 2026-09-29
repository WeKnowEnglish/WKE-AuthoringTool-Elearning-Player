import { describe, expect, it } from "vitest";
import { buildTeacherWelcomeEmail } from "@/lib/email/teacher-welcome";

describe("buildTeacherWelcomeEmail", () => {
  it("includes light membership copy and a secure invitation", () => {
    const { subject, text } = buildTeacherWelcomeEmail({
      fullName: "Thảo",
      email: "teacher@example.com",
      tier: "light",
      invitationUrl: "https://weknowenglish.online/auth/confirm?token_hash=secret&type=invite",
    });
    expect(subject).toContain("Teacher Light");
    expect(text).toContain("Hi Thảo");
    expect(text).toContain("teacher@example.com");
    expect(text).not.toContain("00000000");
    expect(text).toContain("Teacher Light");
    expect(text).toContain("/auth/confirm?token_hash=secret");
    expect(text).toContain("choose your password");
  });

  it("includes plus membership copy", () => {
    const { subject, text } = buildTeacherWelcomeEmail({
      fullName: "Alex",
      email: "plus@example.com",
      tier: "plus",
      invitationUrl: "https://weknowenglish.online/auth/confirm?token_hash=secret&type=invite",
    });
    expect(subject).toContain("Teacher Plus");
    expect(text).toContain("Teacher Plus");
    expect(text).toContain("Virtual Classroom");
  });
});

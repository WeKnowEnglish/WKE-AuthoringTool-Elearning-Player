import { describe, expect, it } from "vitest";
import { parseAdminTeacherEmail } from "@/lib/email/admin-communications";

describe("admin teacher email validation", () => {
  it("normalizes a confirmed message", () => {
    const result = parseAdminTeacherEmail({
      recipientEmail: " teacher@example.com ",
      recipientName: " Alex ",
      subject: " Welcome ",
      bodyText: " Hello from We Know English. ",
      confirmed: "yes",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.recipientEmail).toBe("teacher@example.com");
    expect(result.data.subject).toBe("Welcome");
  });

  it("rejects an unconfirmed or malformed send", () => {
    expect(
      parseAdminTeacherEmail({
        recipientEmail: "not-an-email",
        subject: "",
        bodyText: "Hello",
        confirmed: "no",
      }).success,
    ).toBe(false);
  });
});

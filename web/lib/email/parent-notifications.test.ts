import { describe, expect, it } from "vitest";
import { buildGuardianInvitationEmail } from "@/lib/email/guardian-invitation";
import { buildParentNotificationEmail } from "@/lib/email/parent-notifications";

describe("parent portal email privacy", () => {
  it("keeps progress notification emails generic", () => {
    const email = buildParentNotificationEmail("report_published");
    expect(email.text).toContain("Sign in securely");
    expect(email.text).toContain("learning details are never included");
    expect(email.text).not.toMatch(/score|answer|mastery|strength|next focus/i);
  });

  it("keeps access-change notification emails generic", () => {
    const email = buildParentNotificationEmail("access_changed");
    expect(email.text).toContain("family access connections");
    expect(email.text).toContain("no student learning details");
  });

  it("uses private expiring invitation links without putting learning details in email", () => {
    const email = buildGuardianInvitationEmail({
      email: "parent@example.com",
      studentFirstName: "Mina",
      classTitle: "Primary A2",
      token: "private-token",
      expiresAt: "2026-08-10T00:00:00.000Z",
    });
    expect(email.text).toContain("/parent/invitations/private-token");
    expect(email.text).toContain("expires on");
    expect(email.text).toContain("does not contain grades, assessment answers");
  });
});

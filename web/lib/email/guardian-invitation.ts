import "server-only";

import { resolveAppOrigin, sendResendEmail, type SendEmailResult } from "@/lib/email/resend";

export type GuardianInvitationEmailInput = {
  email: string;
  studentFirstName: string;
  classTitle: string;
  inviterName?: string | null;
  token: string;
  expiresAt: string;
};

export function buildGuardianInvitationEmail(input: GuardianInvitationEmailInput): {
  subject: string;
  text: string;
} {
  const origin = resolveAppOrigin();
  const invitationUrl = `${origin}/parent/invitations/${encodeURIComponent(input.token)}`;
  const expiry = new Date(input.expiresAt);
  const expiryLabel = Number.isFinite(expiry.getTime())
    ? expiry.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "seven days";
  const studentName = input.studentFirstName.trim() || "your child";
  const inviter = input.inviterName?.trim() || "your child's teacher";

  return {
    subject: `Invitation to view ${studentName}'s learning`,
    text: [
      "Hello,",
      "",
      `${inviter} invited you to view ${studentName}'s learning progress on We Know English.`,
      input.classTitle.trim() ? `Class: ${input.classTitle.trim()}` : "",
      "",
      "Open the secure invitation:",
      invitationUrl,
      "",
      `This invitation expires on ${expiryLabel}.`,
      "Sign in or create an account using this email address. The invitation cannot be accepted from a different email address.",
      "",
      "For privacy, this email does not contain grades, assessment answers, or other detailed student information.",
      "",
      "If you were not expecting this invitation, you can ignore this email or contact the class teacher.",
      "",
      "We Know English",
    ].filter(Boolean).join("\n"),
  };
}

export async function sendGuardianInvitationEmail(
  input: GuardianInvitationEmailInput,
): Promise<SendEmailResult> {
  const { subject, text } = buildGuardianInvitationEmail(input);
  return sendResendEmail({
    to: input.email,
    subject,
    text,
    from: process.env.PARENT_PORTAL_FROM_EMAIL?.trim() || undefined,
    replyTo: process.env.PARENT_PORTAL_SUPPORT_EMAIL?.trim() || undefined,
  });
}

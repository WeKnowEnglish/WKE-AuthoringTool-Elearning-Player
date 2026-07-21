import "server-only";

import type { TeacherTier } from "@/lib/auth/roles";
import { resolveAppOrigin, sendResendEmail, type SendEmailResult } from "@/lib/email/resend";

export type TeacherWelcomeEmailInput = {
  fullName: string;
  email: string;
  tier: TeacherTier;
  tempPassword: string;
};

function tierBlurb(tier: TeacherTier): { title: string; lines: string[] } {
  if (tier === "light") {
    return {
      title: "Teacher Light",
      lines: [
        "With Teacher Light you can:",
        "- Create classes and share join codes",
        "- Build word packs and pack quizzes",
        "- Upload media and publish grammar posters",
        "- Assign homework and see simple completion counts",
        "",
        "Live hosting (Virtual Classroom, Live Game, and in-class live tools) is available on Teacher Plus.",
      ],
    };
  }
  return {
    title: "Teacher Plus",
    lines: [
      "With Teacher Plus you can use the full teacher portal, including live classroom tools",
      "(Virtual Classroom, Live Game, whiteboards, and related host features).",
    ],
  };
}

export function buildTeacherWelcomeEmail(input: TeacherWelcomeEmailInput): {
  subject: string;
  text: string;
} {
  const origin = resolveAppOrigin();
  const loginUrl = `${origin}/login?portal=teacher`;
  const membership = tierBlurb(input.tier);
  const name = input.fullName.trim() || "there";

  return {
    subject: `Welcome to We Know English — your ${membership.title} account`,
    text: [
      `Hi ${name},`,
      "",
      'Teacher Brady here. I am so glad you have decided to join the We Know English community. I know that you and your students will love our programs.',
      "",
      `I have approved your teacher account. You have been added as ${membership.title}.`,
      "",
      ...membership.lines,
      "",
      "Sign in here:",
      loginUrl,
      "",
      `Email: ${input.email}`,
      `Temporary password: ${input.tempPassword}`,
      "",
      "On your first sign-in you will be asked to choose a new password.",
      "Do not keep using the temporary password after you set a new one.",
      "",
      "If you have any trouble signing in, reply to this email and I will help you out.",
      "",
      "Teacher Brady — We Know English",
    ].join("\n"),
  };
}

export async function sendTeacherWelcomeEmail(
  input: TeacherWelcomeEmailInput,
): Promise<SendEmailResult> {
  const { subject, text } = buildTeacherWelcomeEmail(input);
  const replyTo = process.env.TEACHER_ACCESS_NOTIFICATION_EMAIL?.trim();
  return sendResendEmail({
    to: input.email,
    subject,
    text,
    replyTo,
  });
}

/** Admin alert when someone submits the public access request form. */
export async function sendTeacherAccessAdminNotification(input: {
  requestId?: string;
  fullName: string;
  email: string;
  school: string;
  reason: string;
}): Promise<SendEmailResult> {
  const to = process.env.TEACHER_ACCESS_NOTIFICATION_EMAIL?.trim();
  if (!to) {
    return { ok: false, error: "TEACHER_ACCESS_NOTIFICATION_EMAIL is not configured." };
  }

  return sendResendEmail({
    to,
    replyTo: input.email,
    subject: `Teacher access request: ${input.fullName}`,
    text: [
      "A teacher requested access to the We Know English teacher portal.",
      "",
      `Name: ${input.fullName}`,
      `Email: ${input.email}`,
      `School/organization: ${input.school}`,
      `Request ID: ${input.requestId ?? "not stored"}`,
      "",
      "How they plan to use the portal:",
      input.reason,
      "",
      "Review the request in Teacher → Admin → Requests before creating an account.",
    ].join("\n"),
  });
}

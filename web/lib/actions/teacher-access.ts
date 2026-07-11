"use server";

import { headers } from "next/headers";
import { rateLimitAllow } from "@/lib/rate-limit/memory";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  validateTeacherAccessRequest,
  type TeacherAccessRequestInput,
} from "@/lib/teacher-access/request-validation";

export type TeacherAccessRequestResult =
  | { ok: true }
  | { ok: false; error: string };

async function sendAdministratorNotification(input: {
  requestId?: string;
  fullName: string;
  email: string;
  school: string;
  reason: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.TEACHER_ACCESS_NOTIFICATION_EMAIL?.trim();
  const from = process.env.TEACHER_ACCESS_FROM_EMAIL?.trim() || "Teacher Access <onboarding@resend.dev>";
  if (!apiKey || !to) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: input.email,
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
        "Review the request before creating a teacher account.",
      ].join("\n"),
    }),
  });

  return response.ok;
}

export async function requestTeacherAccess(
  input: TeacherAccessRequestInput,
): Promise<TeacherAccessRequestResult> {
  const validated = validateTeacherAccessRequest(input);
  if (!validated.ok) return validated;

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  if (!rateLimitAllow(`teacher-access:${clientKey}`, 3, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }
  if (!rateLimitAllow(`teacher-access-email:${validated.value.email}`, 2, 24 * 60 * 60 * 1000)) {
    return { ok: false, error: "A request for this email was already received recently." };
  }

  const admin = createServiceRoleSupabase();
  let requestId: string | undefined;
  if (admin) {
    const { data, error } = await admin
      .from("teacher_access_requests")
      .insert({
        full_name: validated.value.fullName,
        email: validated.value.email,
        school: validated.value.school,
        reason: validated.value.reason,
        notification_status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      return { ok: false, error: "Teacher access requests are temporarily unavailable." };
    }
    requestId = String(data.id);
  }

  let notified = false;
  try {
    notified = await sendAdministratorNotification({ requestId, ...validated.value });
  } catch {
    notified = false;
  }

  if (admin && requestId) {
    await admin
      .from("teacher_access_requests")
      .update({
        notification_status: notified ? "sent" : "failed",
        notified_at: notified ? new Date().toISOString() : null,
      })
      .eq("id", requestId);
  }

  if (!notified) {
    return {
      ok: false,
      error: requestId
        ? "Your request was saved, but the administrator notification could not be sent. Please contact the center directly."
        : "Teacher access requests are not configured yet. Please contact the center directly.",
    };
  }

  return { ok: true };
}

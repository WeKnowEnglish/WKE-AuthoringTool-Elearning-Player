"use server";

import { headers } from "next/headers";
import { rateLimitAllow } from "@/lib/rate-limit/memory";
import { sendTeacherAccessAdminNotification } from "@/lib/email/teacher-welcome";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  validateTeacherAccessRequest,
  type TeacherAccessRequestInput,
} from "@/lib/teacher-access/request-validation";

export type TeacherAccessRequestResult =
  | { ok: true }
  | { ok: false; error: string };

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
    const sent = await sendTeacherAccessAdminNotification({
      requestId,
      ...validated.value,
    });
    notified = sent.ok;
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

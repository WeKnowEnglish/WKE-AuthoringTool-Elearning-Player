import "server-only";

import { resolveAppOrigin, sendResendEmail } from "@/lib/email/resend";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

type NotificationType = "report_published" | "access_changed";

export function buildParentNotificationEmail(
  type: NotificationType,
): { subject: string; text: string } {
  const destination = `${resolveAppOrigin()}/parent/notifications`;
  if (type === "report_published") {
    return {
      subject: "A new We Know English progress report is ready",
      text: [
        "Hello,",
        "",
        "A teacher-reviewed progress report is now available in your We Know English parent portal.",
        "",
        `Sign in securely: ${destination}`,
        "",
        "For student privacy, learning details are never included in notification emails.",
        "",
        "We Know English",
      ].join("\n"),
    };
  }
  return {
    subject: "Your We Know English family access changed",
    text: [
      "Hello,",
      "",
      "A teacher or administrator updated one of your family access connections.",
      "",
      `View your current connections securely: ${destination}`,
      "",
      "This email intentionally contains no student learning details.",
      "",
      "We Know English",
    ].join("\n"),
  };
}

export async function deliverParentNotificationEmails(input: {
  sourceId: string;
  type: NotificationType;
}): Promise<void> {
  const service = createServiceRoleSupabase();
  if (!service) return;

  const { data: notifications, error } = await service
    .from("parent_notifications")
    .select("id, guardian_user_id")
    .eq("source_id", input.sourceId)
    .eq("notification_type", input.type)
    .eq("email_status", "pending");
  if (error || !notifications?.length) return;

  const userIds = Array.from(new Set(notifications.map((row) => String(row.guardian_user_id))));
  const { data: profiles } = await service
    .from("parent_profiles")
    .select("user_id, notification_preferences")
    .in("user_id", userIds);
  const preferencesByUser = new Map(
    (profiles ?? []).map((profile) => [
      String(profile.user_id),
      profile.notification_preferences as Record<string, unknown> | null,
    ]),
  );
  const copy = buildParentNotificationEmail(input.type);

  await Promise.all(
    notifications.map(async (notification) => {
      const userId = String(notification.guardian_user_id);
      const preferences = preferencesByUser.get(userId);
      if (preferences?.importantEmail === false) {
        await service
          .from("parent_notifications")
          .update({ email_status: "disabled" })
          .eq("id", notification.id);
        return;
      }
      const { data: authResult } = await service.auth.admin.getUserById(userId);
      const email = authResult.user?.email?.trim();
      if (!email) {
        await service
          .from("parent_notifications")
          .update({ email_status: "failed" })
          .eq("id", notification.id);
        return;
      }
      const sent = await sendResendEmail({
        to: email,
        subject: copy.subject,
        text: copy.text,
        from: process.env.PARENT_PORTAL_FROM_EMAIL?.trim() || undefined,
        replyTo: process.env.PARENT_PORTAL_SUPPORT_EMAIL?.trim() || undefined,
      });
      await service
        .from("parent_notifications")
        .update({ email_status: sent.ok ? "sent" : "failed" })
        .eq("id", notification.id);
    }),
  );
}

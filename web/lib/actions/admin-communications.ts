"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/admin-context";
import { parseAdminTeacherEmail } from "@/lib/email/admin-communications";
import { sendResendEmail } from "@/lib/email/resend";

export type AdminEmailComposerState = {
  status: "idle" | "success" | "error" | "warning";
  message: string;
};

export const initialAdminEmailComposerState: AdminEmailComposerState = {
  status: "idle",
  message: "",
};

export async function sendAdminTeacherEmail(
  _previous: AdminEmailComposerState,
  formData: FormData,
): Promise<AdminEmailComposerState> {
  const parsed = parseAdminTeacherEmail({
    recipientEmail: formData.get("recipientEmail"),
    recipientName: formData.get("recipientName") || "",
    subject: formData.get("subject"),
    bodyText: formData.get("bodyText"),
    confirmed: formData.get("confirmed"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the email fields and try again.",
    };
  }

  const gate = await requireAdminContext();
  if (!gate.ok) return { status: "error", message: gate.error };

  const input = parsed.data;
  const { data: sendRow, error: insertError } = await gate.ctx.service
    .from("admin_email_sends")
    .insert({
      sent_by: gate.ctx.userId,
      recipient_email: input.recipientEmail.toLowerCase(),
      recipient_name: input.recipientName || null,
      subject: input.subject,
      body_text: input.bodyText,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !sendRow?.id) {
    return {
      status: "error",
      message: insertError?.message ?? "Could not create an auditable email send record.",
    };
  }

  const sent = await sendResendEmail({
    to: input.recipientEmail,
    subject: input.subject,
    text: input.bodyText,
  });

  const now = new Date().toISOString();
  const patch = sent.ok
    ? {
        status: "sent",
        provider_message_id: sent.providerMessageId,
        failure_reason: null,
        sent_at: now,
      }
    : {
        status: "failed",
        provider_message_id: null,
        failure_reason: sent.error.slice(0, 1000),
        sent_at: null,
      };
  const { error: updateError } = await gate.ctx.service
    .from("admin_email_sends")
    .update(patch)
    .eq("id", sendRow.id);

  revalidatePath("/teacher/admin/communications");
  if (!sent.ok) return { status: "error", message: `Email was not sent: ${sent.error}` };
  if (updateError) {
    return {
      status: "warning",
      message: `Email was sent to ${input.recipientEmail}, but its log could not be finalized.`,
    };
  }
  return {
    status: "success",
    message: `Email sent to ${input.recipientEmail}.`,
  };
}

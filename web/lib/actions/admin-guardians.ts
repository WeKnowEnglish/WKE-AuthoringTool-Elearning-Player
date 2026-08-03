"use server";

import { revalidatePath } from "next/cache";
import { requireAdminContext } from "@/lib/admin/admin-context";
import { deliverParentNotificationEmails } from "@/lib/email/parent-notifications";

type Result = { ok: true; message: string } | { ok: false; error: string };

export async function adminRevokeGuardianRelationship(input: {
  relationshipId: string;
}): Promise<Result> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };

  const { data: relationship, error: loadError } = await gate.ctx.service
    .from("student_guardians")
    .select("id, student_id, guardian_user_id, status")
    .eq("id", input.relationshipId)
    .maybeSingle();
  if (loadError) return { ok: false, error: loadError.message };
  if (!relationship) return { ok: false, error: "Guardian relationship not found." };
  if (relationship.status !== "active") {
    return { ok: false, error: "Guardian access is already inactive." };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await gate.ctx.service
    .from("student_guardians")
    .update({
      status: "revoked",
      revoked_at: now,
      revoked_by: gate.ctx.userId,
      updated_at: now,
    })
    .eq("id", relationship.id)
    .eq("status", "active");
  if (updateError) return { ok: false, error: updateError.message };

  await gate.ctx.service.from("guardian_audit_log").insert({
    student_id: relationship.student_id,
    guardian_user_id: relationship.guardian_user_id,
    actor_user_id: gate.ctx.userId,
    action: "guardian_relationship_revoked_by_admin",
    metadata: { relationshipId: relationship.id },
  });

  const { data: profile } = await gate.ctx.service
    .from("parent_profiles")
    .select("notification_preferences")
    .eq("user_id", relationship.guardian_user_id)
    .maybeSingle();
  const preferences = profile?.notification_preferences as Record<string, unknown> | null;
  await gate.ctx.service.from("parent_notifications").upsert(
    {
      guardian_user_id: relationship.guardian_user_id,
      student_id: relationship.student_id,
      notification_type: "access_changed",
      source_id: relationship.id,
      title: "Family access changed",
      body: "An administrator updated one of your child connections. View your current linked children for details.",
      link_path: "/parent/manage-children",
      visible_in_app: preferences?.inApp !== false,
    },
    { onConflict: "guardian_user_id,notification_type,source_id", ignoreDuplicates: true },
  );
  await deliverParentNotificationEmails({
    sourceId: String(relationship.id),
    type: "access_changed",
  }).catch(() => undefined);

  revalidatePath("/teacher/admin/guardians");
  revalidatePath("/parent", "layout");
  return { ok: true, message: "Guardian access revoked immediately." };
}

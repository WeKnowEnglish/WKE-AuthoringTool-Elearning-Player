"use server";

import { revalidatePath } from "next/cache";
import { sendGuardianInvitationEmail } from "@/lib/email/guardian-invitation";
import { deliverParentNotificationEmails } from "@/lib/email/parent-notifications";
import {
  createGuardianInvitationToken,
  guardianInvitationExpiresAt,
  hashGuardianInvitationToken,
  isGuardianRelationshipType,
  isPlausibleGuardianInvitationToken,
  isValidGuardianEmail,
  normalizeGuardianEmail,
} from "@/lib/parent/guardian-domain";
import { requireTeacherStudentGuardianContext } from "@/lib/parent/guardian-data";
import { createClient } from "@/lib/supabase/server";

export type GuardianActionResult =
  | { ok: true; message?: string; studentId?: string }
  | { ok: false; error: string };

function teacherStudentPath(classId: string, studentId: string): string {
  return `/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`;
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || "your child";
}

export async function inviteGuardian(input: {
  classId: string;
  studentId: string;
  email: string;
  relationshipType: string;
}): Promise<GuardianActionResult> {
  try {
    if (!isValidGuardianEmail(input.email)) {
      return { ok: false, error: "Enter a valid parent or guardian email address." };
    }
    if (!isGuardianRelationshipType(input.relationshipType)) {
      return { ok: false, error: "Choose Parent or Guardian." };
    }

    const context = await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const token = createGuardianInvitationToken();
    const expiresAt = guardianInvitationExpiresAt();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_guardian_invitation", {
      p_student_id: context.student.id,
      p_email: normalizeGuardianEmail(input.email),
      p_relationship_type: input.relationshipType,
      p_token_hash: hashGuardianInvitationToken(token),
      p_expires_at: expiresAt,
    });

    if (error || !data || typeof data !== "object") {
      return { ok: false, error: error?.message ?? "Could not create the invitation." };
    }
    const result = data as Record<string, unknown>;
    if (result.ok !== true) {
      const errorCode = String(result.error ?? "create_failed");
      if (errorCode === "rate_limited") {
        return { ok: false, error: "Wait one minute before sending another invitation." };
      }
      if (errorCode === "not_authorized") {
        return { ok: false, error: "You can only invite guardians for students in an active class you manage." };
      }
      return { ok: false, error: "Could not create the invitation." };
    }

    const invitationId = String(result.invitationId);
    const inviterName =
      typeof context.user.user_metadata?.display_name === "string"
        ? context.user.user_metadata.display_name
        : context.user.email?.split("@")[0] ?? null;
    const sent = await sendGuardianInvitationEmail({
      email: normalizeGuardianEmail(input.email),
      studentFirstName: firstName(context.student.displayName),
      classTitle: context.teacherClass.title,
      inviterName,
      token,
      expiresAt,
    });

    await supabase.rpc("set_guardian_invitation_email_status", {
      p_invitation_id: invitationId,
      p_status: sent.ok ? "sent" : "failed",
    });

    revalidatePath(teacherStudentPath(input.classId, input.studentId));
    if (!sent.ok) {
      return {
        ok: false,
        error: `The invitation was saved, but the email could not be sent: ${sent.error}`,
      };
    }
    return {
      ok: true,
      message: result.resent === true ? "Invitation resent." : "Invitation sent.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not invite the guardian.",
    };
  }
}

export async function cancelGuardianInvitation(input: {
  classId: string;
  studentId: string;
  invitationId: string;
}): Promise<GuardianActionResult> {
  try {
    await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_guardian_invitation", {
      p_invitation_id: input.invitationId,
    });
    if (error || data !== true) {
      return { ok: false, error: error?.message ?? "The invitation could not be cancelled." };
    }
    revalidatePath(teacherStudentPath(input.classId, input.studentId));
    return { ok: true, message: "Invitation cancelled." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not cancel the invitation.",
    };
  }
}

export async function revokeGuardianRelationship(input: {
  classId: string;
  studentId: string;
  relationshipId: string;
}): Promise<GuardianActionResult> {
  try {
    await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("revoke_guardian_relationship", {
      p_relationship_id: input.relationshipId,
    });
    if (error || data !== true) {
      return { ok: false, error: error?.message ?? "Guardian access could not be revoked." };
    }
    await supabase.rpc("create_access_changed_notification", {
      p_relationship_id: input.relationshipId,
    });
    await deliverParentNotificationEmails({
      sourceId: input.relationshipId,
      type: "access_changed",
    }).catch(() => undefined);
    revalidatePath(teacherStudentPath(input.classId, input.studentId));
    revalidatePath("/parent");
    revalidatePath(`/parent/students/${encodeURIComponent(input.studentId)}`, "layout");
    return { ok: true, message: "Guardian access revoked." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not revoke guardian access.",
    };
  }
}

export async function acceptGuardianInvitation(input: {
  token: string;
}): Promise<GuardianActionResult> {
  if (!isPlausibleGuardianInvitationToken(input.token)) {
    return { ok: false, error: "This invitation is invalid or has expired." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_guardian_invitation", {
    p_token_hash: hashGuardianInvitationToken(input.token),
  });
  if (error || !data || typeof data !== "object") {
    return { ok: false, error: error?.message ?? "This invitation could not be accepted." };
  }
  const result = data as Record<string, unknown>;
  if (result.ok !== true) {
    const code = String(result.error ?? "invalid_or_expired");
    if (code === "wrong_account") {
      return {
        ok: false,
        error: "This invitation was sent to another email address. Sign in with the invited email.",
      };
    }
    if (code === "verified_email_required") {
      return { ok: false, error: "Verify your email address before accepting this invitation." };
    }
    return { ok: false, error: "This invitation is invalid or has expired." };
  }
  const studentId = String(result.studentId);
  revalidatePath("/parent");
  revalidatePath(`/parent/students/${encodeURIComponent(studentId)}`, "layout");
  return { ok: true, studentId, message: "Your child is now linked to your account." };
}

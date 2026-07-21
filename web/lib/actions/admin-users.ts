"use server";

import { revalidatePath } from "next/cache";
import {
  findAuthUserByEmail,
  listAuthUsersPaginated,
  requireAdminContext,
} from "@/lib/admin/admin-context";
import {
  DEFAULT_TEACHER_TEMP_PASSWORD,
  provisionTeacherAccount,
} from "@/lib/admin/provision-teacher";
import type { AccessRequestStatus, AdminTeacherSummary } from "@/lib/data/admin-users";
import {
  searchAdminStudents as searchAdminStudentsData,
  type AdminStudentSummary,
} from "@/lib/data/admin-users";
import { getTeacherTier, type TeacherTier } from "@/lib/auth/roles";
import { validateStudentPin } from "@/lib/auth/student-credentials";
import { sendTeacherWelcomeEmail } from "@/lib/email/teacher-welcome";
import { isLearningBand } from "@/lib/learning-band";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateAdmin() {
  revalidatePath("/teacher/admin");
  revalidatePath("/teacher/admin/requests");
  revalidatePath("/teacher/admin/teachers");
  revalidatePath("/teacher/admin/students");
}

async function patchWelcomeEmailStatus(
  service: SupabaseClient,
  requestId: string,
  sent: boolean,
) {
  const { error } = await service
    .from("teacher_access_requests")
    .update({
      welcome_email_status: sent ? "sent" : "failed",
      welcome_emailed_at: sent ? new Date().toISOString() : null,
    })
    .eq("id", requestId);
  // Migration 067 may not be applied yet.
  if (error && /welcome_email|column/i.test(error.message)) {
    return;
  }
}

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ApproveAccessRequestResult =
  | {
      ok: true;
      tempPassword: string;
      email: string;
      tier: TeacherTier;
      created: boolean;
      userId: string;
      welcomeEmailSent: boolean;
      welcomeEmailError?: string;
    }
  | { ok: false; error: string };

export async function approveTeacherAccessRequest(input: {
  requestId: string;
  tier: TeacherTier;
  note?: string;
}): Promise<ApproveAccessRequestResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  if (input.tier !== "light" && input.tier !== "plus") {
    return { ok: false, error: "Pick light or plus." };
  }

  const { data: row, error: loadError } = await gate.ctx.service
    .from("teacher_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "pending") {
    return { ok: false, error: `Request is already ${row.status}.` };
  }

  const provisioned = await provisionTeacherAccount(gate.ctx.service, {
    email: String(row.email),
    tier: input.tier,
    password: DEFAULT_TEACHER_TEMP_PASSWORD,
    mustChangePassword: true,
  });
  if (!provisioned.ok) return provisioned;

  const reviewPatch = {
    status: "approved" as const,
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.ctx.userId,
    review_note: input.note?.trim() || null,
    provisioned_user_id: provisioned.userId,
  };

  let { error: updateError } = await gate.ctx.service
    .from("teacher_access_requests")
    .update(reviewPatch)
    .eq("id", input.requestId);

  // Migration 066 may not be applied yet — fall back to core columns.
  if (updateError && /reviewed_by|review_note|provisioned_user_id|column/i.test(updateError.message)) {
    const fallback = await gate.ctx.service
      .from("teacher_access_requests")
      .update({
        status: "approved",
        reviewed_at: reviewPatch.reviewed_at,
      })
      .eq("id", input.requestId);
    updateError = fallback.error;
  }

  if (updateError) {
    return {
      ok: false,
      error: `Teacher was provisioned, but the request row could not be updated: ${updateError.message}`,
    };
  }

  const welcome = await sendTeacherWelcomeEmail({
    fullName: String(row.full_name ?? ""),
    email: provisioned.email,
    tier: provisioned.tier,
    tempPassword: provisioned.tempPassword,
  });
  await patchWelcomeEmailStatus(gate.ctx.service, input.requestId, welcome.ok);

  revalidateAdmin();
  return {
    ok: true,
    tempPassword: provisioned.tempPassword,
    email: provisioned.email,
    tier: provisioned.tier,
    created: provisioned.created,
    userId: provisioned.userId,
    welcomeEmailSent: welcome.ok,
    welcomeEmailError: welcome.ok ? undefined : welcome.error,
  };
}

export async function resendTeacherWelcomeEmail(input: {
  requestId: string;
}): Promise<
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data: row, error: loadError } = await gate.ctx.service
    .from("teacher_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "approved") {
    return { ok: false, error: "Welcome email can only be resent for approved requests." };
  }

  const email = String(row.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Request has no email." };

  // Reset temp password + induction so the emailed credentials always work.
  let tier: TeacherTier = "light";
  if (row.provisioned_user_id) {
    const existing = await gate.ctx.service.auth.admin.getUserById(String(row.provisioned_user_id));
    const raw = existing.data.user?.app_metadata?.teacher_tier;
    if (raw === "plus" || raw === "light") tier = raw;
  } else {
    const byEmail = await findAuthUserByEmail(gate.ctx.service, email);
    const raw = byEmail?.app_metadata?.teacher_tier;
    if (raw === "plus" || raw === "light") tier = raw;
  }

  const provisioned = await provisionTeacherAccount(gate.ctx.service, {
    email,
    tier,
    password: DEFAULT_TEACHER_TEMP_PASSWORD,
    mustChangePassword: true,
  });
  if (!provisioned.ok) return provisioned;

  const welcome = await sendTeacherWelcomeEmail({
    fullName: String(row.full_name ?? ""),
    email: provisioned.email,
    tier: provisioned.tier,
    tempPassword: provisioned.tempPassword,
  });
  await patchWelcomeEmailStatus(gate.ctx.service, input.requestId, welcome.ok);

  if (!welcome.ok) {
    return { ok: false, error: welcome.error };
  }

  revalidateAdmin();
  return {
    ok: true,
    email: provisioned.email,
    tempPassword: provisioned.tempPassword,
  };
}

export async function declineTeacherAccessRequest(input: {
  requestId: string;
  note?: string;
}): Promise<AdminActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data: row, error: loadError } = await gate.ctx.service
    .from("teacher_access_requests")
    .select("id, status")
    .eq("id", input.requestId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "pending") {
    return { ok: false, error: `Request is already ${row.status}.` };
  }

  const reviewPatch = {
    status: "declined" as const,
    reviewed_at: new Date().toISOString(),
    reviewed_by: gate.ctx.userId,
    review_note: input.note?.trim() || null,
  };

  let { error } = await gate.ctx.service
    .from("teacher_access_requests")
    .update(reviewPatch)
    .eq("id", input.requestId);

  if (error && /reviewed_by|review_note|column/i.test(error.message)) {
    const fallback = await gate.ctx.service
      .from("teacher_access_requests")
      .update({
        status: "declined",
        reviewed_at: reviewPatch.reviewed_at,
      })
      .eq("id", input.requestId);
    error = fallback.error;
  }

  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function listAdminTeachers(): Promise<
  { ok: true; teachers: AdminTeacherSummary[] } | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  try {
    const users = await listAuthUsersPaginated(gate.ctx.service);
    const teachers: AdminTeacherSummary[] = users
      .filter((u) => u.app_metadata?.role === "teacher")
      .map((u) => {
        const tier = getTeacherTier({
          email: u.email,
          app_metadata: u.app_metadata as Record<string, unknown>,
        });
        const adminFlag =
          u.app_metadata?.admin === true ||
          u.app_metadata?.admin === "true" ||
          u.app_metadata?.admin === 1;
        const mustChange =
          u.app_metadata?.must_change_password === true ||
          u.app_metadata?.must_change_password === "true" ||
          u.app_metadata?.must_change_password === 1;
        return {
          id: u.id,
          email: u.email ?? "",
          tier: tier ?? "plus",
          isAdmin: Boolean(adminFlag),
          mustChangePassword: Boolean(mustChange),
          createdAt: u.created_at ?? null,
        };
      })
      .sort((a, b) => a.email.localeCompare(b.email));
    return { ok: true, teachers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not list teachers.",
    };
  }
}

export async function setTeacherTier(input: {
  userId: string;
  tier: TeacherTier;
}): Promise<AdminActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;
  if (input.tier !== "light" && input.tier !== "plus") {
    return { ok: false, error: "Pick light or plus." };
  }

  const { data, error: getError } = await gate.ctx.service.auth.admin.getUserById(input.userId);
  if (getError || !data.user) {
    return { ok: false, error: getError?.message ?? "Teacher not found." };
  }
  if (data.user.app_metadata?.role !== "teacher") {
    return { ok: false, error: "That account is not a teacher." };
  }

  const { error } = await gate.ctx.service.auth.admin.updateUserById(input.userId, {
    app_metadata: {
      ...data.user.app_metadata,
      role: "teacher",
      teacher_tier: input.tier,
    },
  });
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function forceTeacherPasswordInduction(input: {
  userId: string;
}): Promise<
  | { ok: true; tempPassword: string; email: string }
  | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data, error: getError } = await gate.ctx.service.auth.admin.getUserById(input.userId);
  if (getError || !data.user) {
    return { ok: false, error: getError?.message ?? "Teacher not found." };
  }
  if (data.user.app_metadata?.role !== "teacher") {
    return { ok: false, error: "That account is not a teacher." };
  }

  const tempPassword = DEFAULT_TEACHER_TEMP_PASSWORD;
  const { error } = await gate.ctx.service.auth.admin.updateUserById(input.userId, {
    password: tempPassword,
    app_metadata: {
      ...data.user.app_metadata,
      role: "teacher",
      must_change_password: true,
    },
  });
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return {
    ok: true,
    tempPassword,
    email: data.user.email ?? "",
  };
}

/**
 * Resend welcome/invitation email for a teacher who has not finished password induction.
 * Resets the temporary password so the emailed credentials always match.
 */
export async function resendTeacherInvitationByUserId(input: {
  userId: string;
}): Promise<
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data, error: getError } = await gate.ctx.service.auth.admin.getUserById(input.userId);
  if (getError || !data.user) {
    return { ok: false, error: getError?.message ?? "Teacher not found." };
  }
  if (data.user.app_metadata?.role !== "teacher") {
    return { ok: false, error: "That account is not a teacher." };
  }

  const mustChange =
    data.user.app_metadata?.must_change_password === true ||
    data.user.app_metadata?.must_change_password === "true" ||
    data.user.app_metadata?.must_change_password === 1;
  if (!mustChange) {
    return {
      ok: false,
      error:
        "This teacher already set a password. Use “Reset temp password” first if you need to re-invite them.",
    };
  }

  const email = (data.user.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Teacher has no email." };

  const tierRaw = data.user.app_metadata?.teacher_tier;
  const tier: TeacherTier = tierRaw === "plus" ? "plus" : "light";
  const tempPassword = DEFAULT_TEACHER_TEMP_PASSWORD;

  const { error: updateError } = await gate.ctx.service.auth.admin.updateUserById(input.userId, {
    password: tempPassword,
    app_metadata: {
      ...data.user.app_metadata,
      role: "teacher",
      teacher_tier: tier,
      must_change_password: true,
    },
  });
  if (updateError) return { ok: false, error: updateError.message };

  let fullName = email.split("@")[0] || "there";
  const { data: requestRow } = await gate.ctx.service
    .from("teacher_access_requests")
    .select("id, full_name")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (requestRow?.full_name) {
    fullName = String(requestRow.full_name);
  }

  const welcome = await sendTeacherWelcomeEmail({
    fullName,
    email,
    tier,
    tempPassword,
  });

  if (requestRow?.id) {
    await patchWelcomeEmailStatus(gate.ctx.service, String(requestRow.id), welcome.ok);
  }

  if (!welcome.ok) {
    return { ok: false, error: welcome.error };
  }

  revalidateAdmin();
  return { ok: true, email, tempPassword };
}

export async function searchStudentsForAdmin(query: string): Promise<
  { ok: true; students: AdminStudentSummary[] } | { ok: false; error: string }
> {
  return searchAdminStudentsData(query);
}

export async function resetStudentPin(input: {
  userId: string;
  pin: string;
}): Promise<AdminActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const pinErr = validateStudentPin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  const { data: profile, error: profileError } = await gate.ctx.service
    .from("student_profiles")
    .select("user_id")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (profileError) return { ok: false, error: profileError.message };
  if (!profile) return { ok: false, error: "Student profile not found." };

  const { data, error: getError } = await gate.ctx.service.auth.admin.getUserById(input.userId);
  if (getError || !data.user) {
    return { ok: false, error: getError?.message ?? "Student auth user not found." };
  }
  if (data.user.app_metadata?.role !== "student") {
    return { ok: false, error: "That account is not a student." };
  }

  const { error } = await gate.ctx.service.auth.admin.updateUserById(input.userId, {
    password: input.pin.trim(),
  });
  if (error) return { ok: false, error: error.message };
  revalidateAdmin();
  return { ok: true };
}

export async function setStudentLearningBandAdmin(input: {
  userId: string;
  learningBand: string;
}): Promise<AdminActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;
  if (!isLearningBand(input.learningBand)) {
    return { ok: false, error: "Invalid learning band." };
  }

  const { data, error: getError } = await gate.ctx.service.auth.admin.getUserById(input.userId);
  if (getError || !data.user) {
    return { ok: false, error: getError?.message ?? "Student not found." };
  }

  const { error: authError } = await gate.ctx.service.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      ...data.user.user_metadata,
      learning_band: input.learningBand,
    },
  });
  if (authError) return { ok: false, error: authError.message };

  const { error: profileError } = await gate.ctx.service
    .from("student_profiles")
    .update({
      learning_band: input.learningBand,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId);
  if (profileError) return { ok: false, error: profileError.message };

  revalidateAdmin();
  return { ok: true };
}

/** Used by pages that need a status filter type export without circular imports. */
export type { AccessRequestStatus };

/** Escape hatch for pages that need email lookup (e.g. conflict messaging). */
export async function adminFindUserByEmail(email: string) {
  const gate = await requireAdminContext();
  if (!gate.ok) return null;
  return findAuthUserByEmail(gate.ctx.service, email);
}

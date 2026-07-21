import "server-only";

import type { TeacherTier } from "@/lib/auth/roles";
import { findAuthUserByEmail } from "@/lib/admin/admin-context";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_TEACHER_TEMP_PASSWORD = "00000000";

export type ProvisionTeacherInput = {
  email: string;
  password?: string;
  tier: TeacherTier;
  mustChangePassword?: boolean;
};

export type ProvisionTeacherResult =
  | {
      ok: true;
      userId: string;
      email: string;
      tier: TeacherTier;
      tempPassword: string;
      created: boolean;
    }
  | { ok: false; error: string };

function buildTeacherAppMetadata(
  existing: Record<string, unknown> | undefined,
  tier: TeacherTier,
  mustChangePassword: boolean,
) {
  return {
    ...(existing ?? {}),
    role: "teacher",
    // Never grant admin from provisioning.
    admin: existing?.admin === true,
    teacher_tier: tier,
    must_change_password: mustChangePassword,
  };
}

/**
 * Create or update a teacher Auth user (service role).
 * Never sets admin:true for newly provisioned accounts.
 */
export async function provisionTeacherAccount(
  service: SupabaseClient,
  input: ProvisionTeacherInput,
): Promise<ProvisionTeacherResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  if (input.tier !== "light" && input.tier !== "plus") {
    return { ok: false, error: "Teacher tier must be light or plus." };
  }

  const tempPassword = input.password?.trim() || DEFAULT_TEACHER_TEMP_PASSWORD;
  if (tempPassword.length < 8) {
    return { ok: false, error: "Temporary password must be at least 8 characters." };
  }
  const mustChangePassword = input.mustChangePassword !== false;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: buildTeacherAppMetadata(undefined, input.tier, mustChangePassword),
  });

  if (!error && data.user?.id) {
    return {
      ok: true,
      userId: data.user.id,
      email: data.user.email ?? email,
      tier: input.tier,
      tempPassword,
      created: true,
    };
  }

  const msg = error?.message || "Could not create teacher.";
  if (!/already|exists|registered/i.test(msg)) {
    return { ok: false, error: msg };
  }

  let existing;
  try {
    existing = await findAuthUserByEmail(service, email);
  } catch (lookupError) {
    return {
      ok: false,
      error: lookupError instanceof Error ? lookupError.message : "Could not look up existing user.",
    };
  }
  if (!existing) {
    return { ok: false, error: "User already exists but could not be found for update." };
  }

  if (existing.app_metadata?.role === "student") {
    return {
      ok: false,
      error: "That email belongs to a student account. Use a different email for the teacher.",
    };
  }

  const { data: updated, error: upErr } = await service.auth.admin.updateUserById(existing.id, {
    password: tempPassword,
    email_confirm: true,
    app_metadata: buildTeacherAppMetadata(
      (existing.app_metadata as Record<string, unknown> | undefined) ?? {},
      input.tier,
      mustChangePassword,
    ),
  });
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  return {
    ok: true,
    userId: updated.user?.id ?? existing.id,
    email: updated.user?.email ?? existing.email ?? email,
    tier: input.tier,
    tempPassword,
    created: false,
  };
}

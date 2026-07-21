"use server";

import {
  isTeacher,
  mustChangePassword,
  TEACHER_TEMP_PASSWORDS,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type CompleteTeacherPasswordInductionResult =
  | { ok: true }
  | { ok: false; error: string };

function validateNewPassword(
  password: string,
  passwordConfirm: string,
): { ok: true } | { ok: false; error: string } {
  if (password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }
  if (password !== passwordConfirm) {
    return { ok: false, error: "Passwords do not match." };
  }
  if (TEACHER_TEMP_PASSWORDS.has(password)) {
    return { ok: false, error: "Choose a new password — do not reuse the temporary one." };
  }
  return { ok: true };
}

/**
 * First-login induction: set a new password and clear `must_change_password`.
 * Uses the signed-in teacher session for the password update, then service role
 * to clear the induction flag in app_metadata.
 */
export async function completeTeacherPasswordInduction(input: {
  password: string;
  passwordConfirm: string;
}): Promise<CompleteTeacherPasswordInductionResult> {
  const validated = validateNewPassword(input.password, input.passwordConfirm);
  if (!validated.ok) return validated;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isTeacher(user)) {
    return { ok: false, error: "Teacher authentication required." };
  }
  if (!mustChangePassword(user)) {
    return { ok: false, error: "Password induction is not required for this account." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: input.password,
  });
  if (passwordError) {
    return { ok: false, error: passwordError.message };
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return {
      ok: false,
      error: "Password was updated, but induction could not be cleared. Contact the center.",
    };
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      role: "teacher",
      must_change_password: false,
    },
  });
  if (metaError) {
    return {
      ok: false,
      error: "Password was updated, but induction could not be cleared. Contact the center.",
    };
  }

  return { ok: true };
}

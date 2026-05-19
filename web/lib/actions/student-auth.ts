"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  normalizeUsername,
  usernameToStudentEmail,
  validateStudentPin,
  validateUsername,
} from "@/lib/auth/student-credentials";
import { isLearningBand, type LearningBand } from "@/lib/learning-band";

export type StudentAuthResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function registerStudentAccount(input: {
  username: string;
  pin: string;
  learningBand: string;
}): Promise<StudentAuthResult> {
  const normalized = normalizeUsername(input.username);
  const usernameErr = validateUsername(normalized);
  if (usernameErr) return { ok: false, error: usernameErr };

  const pinErr = validateStudentPin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  if (!isLearningBand(input.learningBand)) {
    return { ok: false, error: "Pick a level first (A1, A2, or B1)." };
  }
  const learningBand: LearningBand = input.learningBand;

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return {
      ok: false,
      error:
        "Student sign-up is not configured yet. Ask your teacher to add SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const { data: existing } = await admin
    .from("student_profiles")
    .select("user_id")
    .eq("username_normalized", normalized)
    .maybeSingle();

  if (existing?.user_id) {
    return { ok: false, error: "That username is taken. Try another one!" };
  }

  const email = usernameToStudentEmail(normalized);
  const displayName = normalized;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.pin.trim(),
    email_confirm: true,
    app_metadata: { role: "student" },
    user_metadata: {
      display_name: displayName,
      username: normalized,
      learning_band: learningBand,
    },
  });

  if (createError) {
    if (/already|registered|exists/i.test(createError.message)) {
      return { ok: false, error: "That username is taken. Try another one!" };
    }
    return { ok: false, error: createError.message };
  }

  const userId = created.user?.id;
  if (!userId) {
    return { ok: false, error: "Could not create your account. Please try again." };
  }

  const { error: profileError } = await admin.from("student_profiles").insert({
    user_id: userId,
    username: normalized,
    username_normalized: normalized,
    display_name: displayName,
    learning_band: learningBand,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  return { ok: true, email };
}

export async function updateStudentLearningBand(learningBand: string): Promise<{ ok: boolean; error?: string }> {
  if (!isLearningBand(learningBand)) {
    return { ok: false, error: "Invalid level." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (user.app_metadata?.role !== "student") {
    return { ok: false, error: "Only students can update learning level." };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { learning_band: learningBand },
  });
  if (metaError) return { ok: false, error: metaError.message };

  const { error: profileError } = await supabase
    .from("student_profiles")
    .update({ learning_band: learningBand, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  return { ok: true };
}

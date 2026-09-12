"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  isStudentSelfRegistrationEnabled,
  STUDENT_SELF_REGISTRATION_DISABLED_MESSAGE,
} from "@/lib/auth/student-registration-policy";
import {
  normalizeUsername,
  usernameToStudentEmail,
  validateStudentPin,
  validateUsername,
} from "@/lib/auth/student-credentials";
import { isLearningBand, type LearningBand } from "@/lib/learning-band";
import {
  isUpstashRateLimitConfigured,
  rateLimitAllow,
} from "@/lib/rate-limit";

export type StudentAuthResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

const STUDENT_SIGNUP_IP_LIMIT = 10;
const STUDENT_SIGNUP_IP_WINDOW_MS = 60 * 60 * 1000;
const STUDENT_SIGNUP_USERNAME_LIMIT = 3;
const STUDENT_SIGNUP_USERNAME_WINDOW_MS = 24 * 60 * 60 * 1000;

function opaqueRateLimitKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

async function studentRegistrationClientKey(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address =
    requestHeaders.get("cf-connecting-ip")?.trim() ||
    forwardedFor ||
    requestHeaders.get("x-real-ip")?.trim() ||
    `unknown:${requestHeaders.get("user-agent")?.slice(0, 120) || "client"}`;
  return opaqueRateLimitKey(address);
}

export async function registerStudentAccount(input: {
  username: string;
  pin: string;
  learningBand: string;
}): Promise<StudentAuthResult> {
  if (!isStudentSelfRegistrationEnabled()) {
    return { ok: false, error: STUDENT_SELF_REGISTRATION_DISABLED_MESSAGE };
  }

  const normalized = normalizeUsername(input.username);
  const usernameErr = validateUsername(normalized);
  if (usernameErr) return { ok: false, error: usernameErr };

  const pinErr = validateStudentPin(input.pin);
  if (pinErr) return { ok: false, error: pinErr };

  if (!isLearningBand(input.learningBand)) {
    return { ok: false, error: "Pick a level first (A1, A2, or B1)." };
  }
  const learningBand: LearningBand = input.learningBand;

  // Public registration must not rely on per-process memory in production:
  // multiple instances would otherwise enforce independent limits.
  if (process.env.NODE_ENV === "production" && !isUpstashRateLimitConfigured()) {
    return {
      ok: false,
      error: "New student account creation is temporarily unavailable. Ask your teacher or parent for help.",
    };
  }

  const clientKey = await studentRegistrationClientKey();
  const [clientAllowed, usernameAllowed] = await Promise.all([
    rateLimitAllow(
      `student-signup-client:${clientKey}`,
      STUDENT_SIGNUP_IP_LIMIT,
      STUDENT_SIGNUP_IP_WINDOW_MS,
    ),
    rateLimitAllow(
      `student-signup-username:${opaqueRateLimitKey(normalized)}`,
      STUDENT_SIGNUP_USERNAME_LIMIT,
      STUDENT_SIGNUP_USERNAME_WINDOW_MS,
    ),
  ]);
  if (!clientAllowed || !usernameAllowed) {
    return {
      ok: false,
      error: "Too many account creation attempts. Ask a teacher or parent for help.",
    };
  }

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

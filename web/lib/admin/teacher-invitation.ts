import "server-only";

import { findAuthUserByEmail } from "@/lib/admin/admin-context";
import type { TeacherTier } from "@/lib/auth/roles";
import { resolveAppOrigin } from "@/lib/email/resend";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TeacherInvitationResult =
  | {
      ok: true;
      userId: string;
      email: string;
      tier: TeacherTier;
      invitationUrl: string;
      created: boolean;
    }
  | { ok: false; error: string };

export function buildTeacherConfirmationUrl(input: {
  origin: string;
  tokenHash: string;
  type: "invite" | "recovery";
}): string {
  const url = new URL("/auth/confirm", input.origin);
  url.searchParams.set("token_hash", input.tokenHash);
  url.searchParams.set("type", input.type);
  url.searchParams.set("next", "/teacher/set-password");
  return url.toString();
}

function teacherMetadata(
  existing: Record<string, unknown> | undefined,
  tier: TeacherTier,
) {
  return {
    ...(existing ?? {}),
    role: "teacher",
    // Approval never grants platform-administrator access.
    admin: existing?.admin === true,
    teacher_tier: tier,
    must_change_password: true,
  };
}

/**
 * Prepare a single-use Supabase invitation/recovery link without emailing a
 * password. The caller sends the link only after role metadata is committed.
 */
export async function prepareTeacherInvitation(
  service: SupabaseClient,
  input: { email: string; fullName: string; tier: TeacherTier },
): Promise<TeacherInvitationResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required." };
  if (input.tier !== "light" && input.tier !== "plus") {
    return { ok: false, error: "Teacher tier must be light or plus." };
  }

  let existing;
  try {
    existing = await findAuthUserByEmail(service, email);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not look up the teacher account.",
    };
  }
  if (existing?.app_metadata?.role === "student") {
    return {
      ok: false,
      error: "That email belongs to a student account. Use a different email for the teacher.",
    };
  }

  const type = existing ? "recovery" : "invite";
  const generated = existing
    ? await service.auth.admin.generateLink({ type: "recovery", email })
    : await service.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { full_name: input.fullName.trim() || undefined },
        },
      });
  const user = generated.data.user ?? existing;
  const tokenHash = generated.data.properties?.hashed_token;
  if (generated.error || !user?.id || !tokenHash) {
    return {
      ok: false,
      error: generated.error?.message ?? "Could not create a secure teacher invitation.",
    };
  }

  const updated = await service.auth.admin.updateUserById(user.id, {
    app_metadata: teacherMetadata(
      (user.app_metadata as Record<string, unknown> | undefined) ?? {},
      input.tier,
    ),
  });
  if (updated.error) {
    // A newly generated invite creates an Auth user. Remove that incomplete
    // user when metadata cannot be secured, while preserving existing users.
    if (!existing) await service.auth.admin.deleteUser(user.id, true).catch(() => undefined);
    return { ok: false, error: updated.error.message };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email ?? email,
    tier: input.tier,
    invitationUrl: buildTeacherConfirmationUrl({
      origin: resolveAppOrigin(),
      tokenHash,
      type,
    }),
    created: !existing,
  };
}

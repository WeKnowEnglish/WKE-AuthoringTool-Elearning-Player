import "server-only";

import { randomInt } from "node:crypto";

import {
  normalizeUsername,
  usernameToStudentEmail,
} from "@/lib/auth/student-credentials";
import { isLearningBand, type LearningBand } from "@/lib/learning-band";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type CreatedTrialStudent = {
  studentId: string;
  username: string;
  pin: string;
  learningBand: LearningBand;
};

export function learningBandFromChildAgeBand(raw: string | null | undefined): LearningBand {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.includes("under") || value.startsWith("7")) return "a1";
  if (value.startsWith("10")) return "a2";
  if (value.startsWith("13") || value.startsWith("16")) return "b1";
  return "a2";
}

function baseUsernameFromDisplayName(displayName: string): string {
  let base = normalizeUsername(displayName);
  if (base.length < 3) base = `kid${base || "learner"}`;
  if (base.length > 14) base = base.slice(0, 14);
  return base;
}

function randomPin(): string {
  return String(randomInt(100000, 1000000));
}

function randomSuffix(): string {
  return String(randomInt(10, 100));
}

/** Create a student Auth user + profile for a confirmed trial prospect. */
export async function createStudentForTrialProspect(input: {
  displayName: string;
  childAgeBand?: string | null;
}): Promise<{ ok: true; student: CreatedTrialStudent } | { ok: false; error: string }> {
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return {
      ok: false,
      error:
        "Student creation is not configured (missing SUPABASE_SERVICE_ROLE_KEY). Confirm linked-child bookings still work; prospect confirms need the service role.",
    };
  }

  const displayName = input.displayName.trim().slice(0, 120) || "Student";
  const learningBand = learningBandFromChildAgeBand(input.childAgeBand);
  if (!isLearningBand(learningBand)) {
    return { ok: false, error: "Invalid learning level." };
  }

  const pin = randomPin();
  let username = baseUsernameFromDisplayName(displayName);
  let createdUserId: string | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? username : `${username.slice(0, 12)}${randomSuffix()}`;
    const email = usernameToStudentEmail(candidate);

    const { data: existing } = await admin
      .from("student_profiles")
      .select("user_id")
      .eq("username_normalized", candidate)
      .maybeSingle();
    if (existing?.user_id) continue;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      app_metadata: { role: "student" },
      user_metadata: {
        display_name: displayName,
        username: candidate,
        learning_band: learningBand,
        created_via: "trial_prospect",
      },
    });

    if (createError) {
      if (/already|registered|exists/i.test(createError.message)) continue;
      return { ok: false, error: createError.message };
    }

    createdUserId = created.user?.id ?? null;
    if (!createdUserId) return { ok: false, error: "Could not create student account." };

    const { error: profileError } = await admin.from("student_profiles").insert({
      user_id: createdUserId,
      username: candidate,
      username_normalized: candidate,
      display_name: displayName,
      learning_band: learningBand,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(createdUserId);
      if (/unique|duplicate/i.test(profileError.message)) continue;
      return { ok: false, error: profileError.message };
    }

    return {
      ok: true,
      student: {
        studentId: createdUserId,
        username: candidate,
        pin,
        learningBand,
      },
    };
  }

  return { ok: false, error: "Could not allocate a unique student username. Try again." };
}

export async function deleteTrialProspectStudent(studentId: string): Promise<void> {
  const admin = createServiceRoleSupabase();
  if (!admin) return;
  try {
    await admin.from("student_profiles").delete().eq("user_id", studentId);
  } catch {
    // best-effort cleanup
  }
  try {
    await admin.auth.admin.deleteUser(studentId);
  } catch {
    // best-effort cleanup
  }
}

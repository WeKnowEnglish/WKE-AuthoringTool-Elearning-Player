import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  hashGuardianInvitationToken,
  isPlausibleGuardianInvitationToken,
  type GuardianInvitationStatus,
  type GuardianRelationshipStatus,
  type GuardianRelationshipType,
} from "@/lib/parent/guardian-domain";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type TeacherGuardianInvitation = {
  id: string;
  email: string;
  relationshipType: GuardianRelationshipType;
  status: GuardianInvitationStatus;
  emailStatus: "pending" | "sent" | "failed";
  expiresAt: string;
  lastSentAt: string;
  createdAt: string;
};

export type TeacherGuardianRelationship = {
  id: string;
  email: string | null;
  relationshipType: GuardianRelationshipType;
  status: GuardianRelationshipStatus;
  activatedAt: string;
  revokedAt: string | null;
};

export type TeacherGuardianBundle = {
  student: {
    id: string;
    displayName: string;
  };
  teacherClass: {
    id: string;
    title: string;
  };
  invitations: TeacherGuardianInvitation[];
  relationships: TeacherGuardianRelationship[];
};

export type GuardianInvitationPreview =
  | {
      ok: true;
      studentId: string;
      studentName: string;
      relationshipType: GuardianRelationshipType;
      expiresAt: string;
    }
  | {
      ok: false;
      error:
        | "auth_required"
        | "verified_email_required"
        | "invalid_or_wrong_account"
        | "invalid_or_expired";
    };

type TeacherStudentContext = {
  user: User;
  student: { id: string; displayName: string };
  teacherClass: { id: string; title: string };
};

export async function requireTeacherStudentGuardianContext(
  classId: string,
  studentId: string,
): Promise<TeacherStudentContext> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }

  const normalizedClassId = classId.trim();
  const normalizedStudentId = studentId.trim();
  const [{ data: teacherClass, error: classError }, { data: enrollment, error: enrollmentError }] =
    await Promise.all([
      supabase
        .from("teacher_classes")
        .select("id, title")
        .eq("id", normalizedClassId)
        .eq("teacher_id", user.id)
        .is("archived_at", null)
        .maybeSingle(),
      supabase
        .from("class_enrollments")
        .select("student_id")
        .eq("class_id", normalizedClassId)
        .eq("student_id", normalizedStudentId)
        .maybeSingle(),
    ]);

  if (classError) throw classError;
  if (enrollmentError) throw enrollmentError;
  if (!teacherClass || !enrollment) {
    throw new Error("Student is not in an active class you manage.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("user_id, display_name")
    .eq("user_id", normalizedStudentId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Student profile not found.");

  return {
    user,
    student: {
      id: String(profile.user_id),
      displayName: String(profile.display_name || "Student"),
    },
    teacherClass: {
      id: String(teacherClass.id),
      title: String(teacherClass.title || "Class"),
    },
  };
}

export async function listGuardianConnectionsForTeacher(
  classId: string,
  studentId: string,
): Promise<TeacherGuardianBundle> {
  const context = await requireTeacherStudentGuardianContext(classId, studentId);
  const supabase = await createClient();

  const [{ data: invitations, error: invitationError }, { data: relationships, error: relationshipError }] =
    await Promise.all([
      supabase
        .from("guardian_invitations")
        .select(
          "id, invited_email, relationship_type, status, email_status, expires_at, last_sent_at, created_at",
        )
        .eq("student_id", context.student.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("student_guardians")
        .select(
          "id, relationship_type, status, activated_at, revoked_at, source_invitation_id",
        )
        .eq("student_id", context.student.id)
        .order("activated_at", { ascending: false }),
    ]);

  if (invitationError) throw invitationError;
  if (relationshipError) throw relationshipError;

  const emailByInvitationId = new Map(
    (invitations ?? []).map((row) => [String(row.id), String(row.invited_email)]),
  );

  return {
    student: context.student,
    teacherClass: context.teacherClass,
    invitations: (invitations ?? []).map((row) => ({
      id: String(row.id),
      email: String(row.invited_email),
      relationshipType: row.relationship_type as GuardianRelationshipType,
      status: row.status as GuardianInvitationStatus,
      emailStatus: row.email_status as "pending" | "sent" | "failed",
      expiresAt: String(row.expires_at),
      lastSentAt: String(row.last_sent_at),
      createdAt: String(row.created_at),
    })),
    relationships: (relationships ?? []).map((row) => ({
      id: String(row.id),
      email:
        row.source_invitation_id == null
          ? null
          : emailByInvitationId.get(String(row.source_invitation_id)) ?? null,
      relationshipType: row.relationship_type as GuardianRelationshipType,
      status: row.status as GuardianRelationshipStatus,
      activatedAt: String(row.activated_at),
      revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    })),
  };
}

export async function getGuardianInvitationPreview(
  token: string,
): Promise<GuardianInvitationPreview> {
  noStore();
  if (!isPlausibleGuardianInvitationToken(token)) {
    return { ok: false, error: "invalid_or_expired" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guardian_invitation_preview", {
    p_token_hash: hashGuardianInvitationToken(token),
  });
  if (error || !data || typeof data !== "object") {
    return { ok: false, error: "invalid_or_expired" };
  }
  const result = data as Record<string, unknown>;
  if (result.ok !== true) {
    const raw = String(result.error ?? "invalid_or_expired");
    if (
      raw === "auth_required" ||
      raw === "verified_email_required" ||
      raw === "invalid_or_wrong_account"
    ) {
      return { ok: false, error: raw };
    }
    return { ok: false, error: "invalid_or_expired" };
  }
  return {
    ok: true,
    studentId: String(result.studentId),
    studentName: String(result.studentName || "your child"),
    relationshipType:
      result.relationshipType === "parent" ? "parent" : "guardian",
    expiresAt: String(result.expiresAt),
  };
}

export type ParentLinkedStudent = {
  studentId: string;
  displayName: string;
  learningBand: string | null;
  classId: string | null;
  classTitle: string | null;
  enrolledAt: string | null;
  preferenceCollectionOpen: boolean;
};

export async function listParentLinkedStudents(): Promise<ParentLinkedStudent[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase.rpc("parent_linked_students");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    studentId: String(row.student_id),
    displayName: String(row.display_name || "Student"),
    learningBand: row.learning_band ? String(row.learning_band) : null,
    classId: row.class_id ? String(row.class_id) : null,
    classTitle: row.class_title ? String(row.class_title) : null,
    enrolledAt: row.enrolled_at ? String(row.enrolled_at) : null,
    preferenceCollectionOpen: Boolean(row.preference_collection_open),
  }));
}

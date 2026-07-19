import "server-only";

import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export async function requireWhiteboardTeacher(
  classId: string,
  options?: { allowArchived?: boolean },
): Promise<{
  userId: string;
  displayName: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }

  const { data: row, error } = await supabase
    .from("teacher_classes")
    .select("id, teacher_id, archived_at")
    .eq("id", classId)
    .maybeSingle();

  if (error) throw error;
  if (!row || row.teacher_id !== user.id) {
    throw new Error("Not your class.");
  }
  if (row.archived_at && !options?.allowArchived) {
    throw new Error("Class is archived.");
  }

  return {
    userId: user.id,
    displayName:
      (user.user_metadata?.display_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Teacher",
  };
}

export async function requireWhiteboardStudent(classId: string): Promise<{
  userId: string;
  displayName: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    throw new Error("Sign in required.");
  }

  const { data: enrollment, error } = await supabase
    .from("class_enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!enrollment) {
    throw new Error("Not enrolled in this class.");
  }

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("display_name, username")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    displayName:
      (profile?.display_name as string | undefined)?.trim() ||
      (profile?.username as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Student",
  };
}

export async function isStudentEnrolledInClass(
  classId: string,
  studentId: string,
): Promise<boolean> {
  const service = createServiceRoleSupabase();
  const supabase = service ?? (await createClient());
  const { data, error } = await supabase
    .from("class_enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function getClassIdForWhiteboardRoom(roomId: string): Promise<string | null> {
  const service = createServiceRoleSupabase();
  if (!service) return null;
  const { data } = await service
    .from("whiteboard_rounds")
    .select("class_id")
    .eq("liveblocks_room_id", roomId)
    .maybeSingle();
  return (data?.class_id as string | null) ?? null;
}

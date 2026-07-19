import "server-only";

import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";

/** Signed-in teacher (no class required). */
export async function requireVirtualClassroomTeacher(): Promise<{
  userId: string;
  displayName: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher login required.");
  }
  return {
    userId: user.id,
    displayName:
      (user.user_metadata?.display_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Teacher",
  };
}

/**
 * Host auth for an existing session:
 * - class-linked → must own the class
 * - one-off → must be the creating teacher
 */
export async function requireVirtualClassroomSessionHost(
  session: VirtualClassroomSessionRecord,
): Promise<{ userId: string; displayName: string }> {
  if (session.classId) {
    return requireWhiteboardTeacher(session.classId, { allowArchived: false });
  }
  const teacher = await requireVirtualClassroomTeacher();
  if (session.createdBy !== teacher.userId) {
    throw new Error("Not your Virtual Classroom session.");
  }
  return teacher;
}

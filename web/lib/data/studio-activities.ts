import { unstable_noStore as noStore } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  getStudioActivityForTeacher,
  listStudioActivitiesForTeacher,
  type StudioActivityDetail,
  type StudioActivitySummary,
} from "@/lib/studio-activities/load";
import { createClient } from "@/lib/supabase/server";

async function requireTeacherContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return { supabase, userId: user.id };
}

export async function listMyStudioActivities(options?: {
  limit?: number;
}): Promise<StudioActivitySummary[]> {
  noStore();
  try {
    const { supabase, userId } = await requireTeacherContext();
    return await listStudioActivitiesForTeacher(supabase, userId, {
      limit: options?.limit ?? 60,
    });
  } catch {
    return [];
  }
}

export async function getMyStudioActivity(
  id: string,
): Promise<StudioActivityDetail | null> {
  noStore();
  try {
    const { supabase, userId } = await requireTeacherContext();
    return await getStudioActivityForTeacher(supabase, userId, id);
  } catch {
    return null;
  }
}

export type { StudioActivityDetail, StudioActivitySummary };

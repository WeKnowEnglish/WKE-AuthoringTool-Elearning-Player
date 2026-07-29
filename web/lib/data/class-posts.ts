import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { mapClassPostRow, type ClassPostRow } from "@/lib/class-posts/map";
import { sortClassPostsForFeed, type ClassPost } from "@/lib/class-posts/types";
import { createClient } from "@/lib/supabase/server";

const POST_SELECT =
  "id, class_id, teacher_id, kind, body, image_url, link_url, link_title, homework_id, activity_space_item_id, activity_title, activity_play_path, pinned_at, published_at, created_at";

const POST_SELECT_LEGACY =
  "id, class_id, teacher_id, kind, body, image_url, link_url, link_title, homework_id, published_at, created_at";

const POST_SELECT_BASE =
  "id, class_id, teacher_id, kind, body, image_url, published_at, created_at";

function isMissingPostsTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_posts") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

function isMissingPostColumns(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("link_url") ||
    message.includes("link_title") ||
    message.includes("homework_id") ||
    message.includes("activity_space_item_id") ||
    message.includes("activity_title") ||
    message.includes("activity_play_path") ||
    message.includes("pinned_at") ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

async function queryClassPosts(
  classId: string,
  limit: number,
): Promise<ClassPost[]> {
  const supabase = await createClient();
  const selects = [POST_SELECT, POST_SELECT_LEGACY, POST_SELECT_BASE];

  for (let i = 0; i < selects.length; i += 1) {
    const result = await supabase
      .from("class_posts")
      .select(selects[i])
      .eq("class_id", classId)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (!result.error) {
      return sortClassPostsForFeed(
        ((result.data ?? []) as ClassPostRow[])
          .map(mapClassPostRow)
          .filter((post): post is ClassPost => post !== null),
      );
    }

    if (isMissingPostsTable(result.error)) return [];
    if (i < selects.length - 1 && isMissingPostColumns(result.error)) continue;
    throw result.error;
  }

  return [];
}

export const listClassPostsForClass = cache(async function listClassPostsForClass(
  classId: string,
  limit = 40,
): Promise<ClassPost[]> {
  await requireTeacherUserId();
  return queryClassPosts(classId, limit);
});

/** Posts visible to an enrolled student for one class. */
export async function listClassPostsForStudentClass(
  classId: string,
  limit = 40,
): Promise<ClassPost[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !isStudent(user)) {
    return [];
  }

  return queryClassPosts(classId, limit);
}

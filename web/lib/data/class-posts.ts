import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  normalizeClassPostBody,
  normalizeClassPostImageUrl,
  normalizeClassPostKind,
} from "@/lib/class-posts/normalize";
import type { ClassPost } from "@/lib/class-posts/types";
import { createClient } from "@/lib/supabase/server";

type ClassPostRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  kind: string;
  body: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
};

function isMissingPostsTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("class_posts") ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  );
}

function mapClassPost(row: ClassPostRow): ClassPost | null {
  const kind = normalizeClassPostKind(row.kind);
  if (!kind) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    kind,
    body: normalizeClassPostBody(row.body),
    imageUrl: normalizeClassPostImageUrl(row.image_url),
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
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

export const listClassPostsForClass = cache(async function listClassPostsForClass(
  classId: string,
  limit = 40,
): Promise<ClassPost[]> {
  await requireTeacherUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_posts")
    .select(
      "id, class_id, teacher_id, kind, body, image_url, published_at, created_at",
    )
    .eq("class_id", classId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingPostsTable(error)) return [];
    throw error;
  }

  return (data as ClassPostRow[])
    .map(mapClassPost)
    .filter((post): post is ClassPost => post !== null);
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

  const { data, error } = await supabase
    .from("class_posts")
    .select(
      "id, class_id, teacher_id, kind, body, image_url, published_at, created_at",
    )
    .eq("class_id", classId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingPostsTable(error)) return [];
    throw error;
  }

  return (data as ClassPostRow[])
    .map(mapClassPost)
    .filter((post): post is ClassPost => post !== null);
}

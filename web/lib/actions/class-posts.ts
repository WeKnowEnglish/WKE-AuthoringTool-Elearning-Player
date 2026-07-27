"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeClassPostBody,
  normalizeClassPostImageUrl,
} from "@/lib/class-posts/normalize";
import type { ClassPost } from "@/lib/class-posts/types";
import { uploadTeacherMedia } from "@/lib/actions/media";
import { createClient } from "@/lib/supabase/server";

export type ClassPostActionResult =
  | { ok: true; post: ClassPost }
  | { ok: false; error: string };

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

function revalidateClassSurfaces(classId: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/primary/class/${classId}`);
  revalidatePath(`/secondary/class/${classId}`);
  revalidatePath("/primary");
  revalidatePath("/secondary");
}

type PostRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  kind: string;
  body: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
};

function mapPostRow(row: PostRow): ClassPost {
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    kind: row.kind === "photo" ? "photo" : "announcement",
    body: normalizeClassPostBody(row.body),
    imageUrl: normalizeClassPostImageUrl(row.image_url),
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

export async function createClassAnnouncementPost(input: {
  classId: string;
  body: string;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const body = normalizeClassPostBody(input.body);
    if (!classId) return { ok: false, error: "Missing class." };
    if (!body) return { ok: false, error: "Write something for your students first." };

    const supabase = await createClient();
    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) return { ok: false, error: classError.message };
    if (!ownedClass) return { ok: false, error: "Class not found." };

    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "announcement",
        body,
      })
      .select(
        "id, class_id, teacher_id, kind, body, image_url, published_at, created_at",
      )
      .single();

    if (error) return { ok: false, error: error.message };

    revalidateClassSurfaces(classId);
    return { ok: true, post: mapPostRow(data as PostRow) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not post announcement.",
    };
  }
}

export async function createClassPhotoPostFromForm(
  formData: FormData,
): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = String(formData.get("classId") ?? "").trim();
    const caption = normalizeClassPostBody(formData.get("caption"));
    const file = formData.get("photo");

    if (!classId) return { ok: false, error: "Missing class." };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a photo to share." };
    }

    const supabase = await createClient();
    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) return { ok: false, error: classError.message };
    if (!ownedClass) return { ok: false, error: "Class not found." };

    const uploadForm = new FormData();
    uploadForm.set("file", file);
    uploadForm.set("skip_near_duplicate", "1");
    const upload = await uploadTeacherMedia(uploadForm, "image", "keep_both");
    const imageUrl = normalizeClassPostImageUrl(upload.url);
    if (!imageUrl) return { ok: false, error: "Photo upload failed." };

    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "photo",
        body: caption,
        image_url: imageUrl,
      })
      .select(
        "id, class_id, teacher_id, kind, body, image_url, published_at, created_at",
      )
      .single();

    if (error) return { ok: false, error: error.message };

    revalidateClassSurfaces(classId);
    return { ok: true, post: mapPostRow(data as PostRow) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not share photo.",
    };
  }
}

export async function deleteClassPost(input: {
  classId: string;
  postId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const postId = input.postId.trim();
    if (!classId || !postId) return { ok: false, error: "Missing post." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("class_posts")
      .delete()
      .eq("id", postId)
      .eq("class_id", classId)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };

    revalidateClassSurfaces(classId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete post.",
    };
  }
}

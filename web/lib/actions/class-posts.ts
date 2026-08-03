"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  normalizeClassPostActivityPlayPath,
  normalizeClassPostActivitySpaceItemId,
  normalizeClassPostActivityTitle,
  normalizeClassPostBody,
  normalizeClassPostHomeworkId,
  normalizeClassPostImageUrl,
  normalizeClassPostLinkTitle,
  normalizeClassPostLinkUrl,
} from "@/lib/class-posts/normalize";
import { mapClassPostRow } from "@/lib/class-posts/map";
import type { ClassPost } from "@/lib/class-posts/types";
import { uploadTeacherMedia } from "@/lib/actions/media";
import { createClient } from "@/lib/supabase/server";

export type ClassPostActionResult =
  | { ok: true; post: ClassPost }
  | { ok: false; error: string };

const MAX_PINNED_POSTS = 5;

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

const POST_SELECT =
  "id, class_id, teacher_id, kind, body, image_url, link_url, link_title, homework_id, activity_space_item_id, activity_title, activity_play_path, pinned_at, guardian_visibility, published_at, created_at";

type PostRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  kind: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_title: string | null;
  homework_id: string | null;
  activity_space_item_id: string | null;
  activity_title: string | null;
  activity_play_path: string | null;
  pinned_at: string | null;
  guardian_visibility: string | null;
  published_at: string;
  created_at: string;
};

function mapPostRow(row: PostRow): ClassPost | null {
  return mapClassPostRow(row);
}

async function assertOwnsClass(
  classId: string,
  teacherId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: ownedClass, error: classError } = await supabase
    .from("teacher_classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (classError) return { ok: false, error: classError.message };
  if (!ownedClass) return { ok: false, error: "Class not found." };
  return { ok: true };
}

async function countPinnedPosts(
  classId: string,
  teacherId: string,
  excludePostId?: string,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("class_posts")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("teacher_id", teacherId)
    .not("pinned_at", "is", null);

  if (excludePostId) {
    query = query.neq("id", excludePostId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function createClassAnnouncementPost(input: {
  classId: string;
  body: string;
  pinned?: boolean;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const body = normalizeClassPostBody(input.body);
    if (!classId) return { ok: false, error: "Missing class." };
    if (!body) return { ok: false, error: "Write something for your students first." };

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (input.pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "announcement",
        body,
        pinned_at: input.pinned ? new Date().toISOString() : null,
      })
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not post announcement." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
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
    const pinned = String(formData.get("pinned") ?? "") === "1";
    const file = formData.get("photo");

    if (!classId) return { ok: false, error: "Missing class." };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a photo to share." };
    }

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const uploadForm = new FormData();
    uploadForm.set("file", file);
    uploadForm.set("skip_near_duplicate", "1");
    const upload = await uploadTeacherMedia(uploadForm, "image", "keep_both");
    const imageUrl = normalizeClassPostImageUrl(upload.url);
    if (!imageUrl) return { ok: false, error: "Photo upload failed." };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "photo",
        body: caption,
        image_url: imageUrl,
        pinned_at: pinned ? new Date().toISOString() : null,
      })
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not share photo." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not share photo.",
    };
  }
}

export async function createClassLinkPost(input: {
  classId: string;
  body?: string;
  linkUrl: string;
  linkTitle?: string;
  pinned?: boolean;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const linkUrl = normalizeClassPostLinkUrl(input.linkUrl);
    const linkTitle = normalizeClassPostLinkTitle(input.linkTitle);
    const body = normalizeClassPostBody(input.body ?? "");

    if (!classId) return { ok: false, error: "Missing class." };
    if (!linkUrl) {
      return { ok: false, error: "Enter a valid http(s) link for students." };
    }

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (input.pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "link",
        body,
        link_url: linkUrl,
        link_title: linkTitle,
        pinned_at: input.pinned ? new Date().toISOString() : null,
      })
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not post link." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not post link.",
    };
  }
}

export async function createClassHomeworkReminderPost(input: {
  classId: string;
  homeworkId: string;
  body?: string;
  pinned?: boolean;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const homeworkId = normalizeClassPostHomeworkId(input.homeworkId);
    let body = normalizeClassPostBody(input.body ?? "");

    if (!classId) return { ok: false, error: "Missing class." };
    if (!homeworkId) return { ok: false, error: "Choose a homework assignment." };

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (input.pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const supabase = await createClient();
    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, title, status")
      .eq("id", homeworkId)
      .eq("class_id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (homeworkError) return { ok: false, error: homeworkError.message };
    if (!homework) return { ok: false, error: "Homework not found for this class." };
    if (homework.status !== "assigned" && homework.status !== "closed") {
      return { ok: false, error: "Assign the homework before posting a reminder." };
    }

    if (!body) {
      body = `Reminder: ${String(homework.title ?? "Homework").trim() || "Homework"}`;
    }

    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "homework_reminder",
        body,
        homework_id: homeworkId,
        pinned_at: input.pinned ? new Date().toISOString() : null,
      })
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not post homework reminder." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not post homework reminder.",
    };
  }
}

export async function createClassActivityPost(input: {
  classId: string;
  spaceItemId: string;
  body?: string;
  pinned?: boolean;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const spaceItemId = normalizeClassPostActivitySpaceItemId(input.spaceItemId);
    const body = normalizeClassPostBody(input.body ?? "");

    if (!classId) return { ok: false, error: "Missing class." };
    if (!spaceItemId) {
      return { ok: false, error: "Choose a Teacher Space activity to share." };
    }

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (input.pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const supabase = await createClient();
    const { data: space, error: spaceError } = await supabase
      .from("teacher_spaces")
      .select("id, handle, is_published")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (spaceError) return { ok: false, error: spaceError.message };
    if (!space) {
      return {
        ok: false,
        error: "Publish a Teacher Space activity first, then share it here.",
      };
    }
    if (!space.is_published) {
      return {
        ok: false,
        error: "Publish your Teacher Space first so students can open the activity.",
      };
    }

    const { data: item, error: itemError } = await supabase
      .from("teacher_space_items")
      .select("id, title")
      .eq("id", spaceItemId)
      .eq("space_id", space.id)
      .maybeSingle();

    if (itemError) return { ok: false, error: itemError.message };
    if (!item) return { ok: false, error: "Activity not found on your Teacher Space." };

    const activityTitle = normalizeClassPostActivityTitle(item.title);
    const activityPlayPath = normalizeClassPostActivityPlayPath(
      `/wke/${String(space.handle).toLowerCase()}/play/${item.id}`,
    );

    if (!activityTitle || !activityPlayPath) {
      return { ok: false, error: "Could not build activity share." };
    }

    const { data, error } = await supabase
      .from("class_posts")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        kind: "activity",
        body,
        activity_space_item_id: item.id,
        activity_title: activityTitle,
        activity_play_path: activityPlayPath,
        pinned_at: input.pinned ? new Date().toISOString() : null,
      })
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not share activity." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not share activity.",
    };
  }
}

export async function setClassPostPinned(input: {
  classId: string;
  postId: string;
  pinned: boolean;
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const postId = input.postId.trim();
    if (!classId || !postId) return { ok: false, error: "Missing post." };

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    if (input.pinned) {
      const pinnedCount = await countPinnedPosts(classId, teacherId, postId);
      if (pinnedCount >= MAX_PINNED_POSTS) {
        return {
          ok: false,
          error: `You can pin up to ${MAX_PINNED_POSTS} posts. Unpin one first.`,
        };
      }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("class_posts")
      .update({
        pinned_at: input.pinned ? new Date().toISOString() : null,
      })
      .eq("id", postId)
      .eq("class_id", classId)
      .eq("teacher_id", teacherId)
      .select(POST_SELECT)
      .single();

    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not update pin." };

    revalidateClassSurfaces(classId);
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update pin.",
    };
  }
}

export async function setClassPostGuardianVisibility(input: {
  classId: string;
  postId: string;
  visibility: "none" | "class_guardians" | "tagged_student_guardians";
  studentIds?: string[];
}): Promise<ClassPostActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    const postId = input.postId.trim();
    if (!classId || !postId) return { ok: false, error: "Missing post." };

    const ownership = await assertOwnsClass(classId, teacherId);
    if (!ownership.ok) return ownership;

    const supabase = await createClient();
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "set_class_post_guardian_visibility",
      {
        p_post_id: postId,
        p_visibility: input.visibility,
        p_student_ids: input.studentIds?.length ? input.studentIds : null,
      },
    );
    if (rpcError || !rpcResult || typeof rpcResult !== "object") {
      return { ok: false, error: rpcError?.message ?? "Could not update guardian visibility." };
    }
    const result = rpcResult as Record<string, unknown>;
    if (result.ok !== true) {
      const code = String(result.error ?? "update_failed");
      if (code === "private_media_required") {
        return {
          ok: false,
          error: "Class photos cannot be shared with guardians until private family media is enabled.",
        };
      }
      if (code === "student_tag_required") {
        return { ok: false, error: "Choose at least one student for a tagged guardian post." };
      }
      return { ok: false, error: "Could not update guardian visibility." };
    }

    const { data, error } = await supabase
      .from("class_posts")
      .select(POST_SELECT)
      .eq("id", postId)
      .eq("class_id", classId)
      .eq("teacher_id", teacherId)
      .single();
    if (error) return { ok: false, error: error.message };
    const post = mapPostRow(data as PostRow);
    if (!post) return { ok: false, error: "Could not reload the post." };

    revalidateClassSurfaces(classId);
    revalidatePath("/parent", "layout");
    return { ok: true, post };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update guardian visibility.",
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

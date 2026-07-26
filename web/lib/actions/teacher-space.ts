"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  ensureTeacherSpace,
  publishActivityToTeacherSpace,
  reorderTeacherSpaceItems,
  unpublishActivityFromSpace,
  unpublishSpaceItem,
  updateTeacherSpaceSettings,
} from "@/lib/teacher-space/mutate";
import { teacherSpacePublicPath } from "@/lib/teacher-space/paths";
import { createClient } from "@/lib/supabase/server";

export type TeacherSpaceActionResult =
  | { ok: true; message?: string; publicPath?: string; itemId?: string }
  | { ok: false; error: string };

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return { supabase, user };
}

function revalidateSpacePaths(handle?: string) {
  revalidatePath("/teacher/classes");
  if (handle) {
    revalidatePath(teacherSpacePublicPath(handle));
    revalidatePath(`/wke/${handle}`, "layout");
  }
}

export async function saveTeacherSpaceSettings(input: {
  title: string;
  bio?: string;
  is_published: boolean;
  theme_id?: string;
  hero_image_url?: string | null;
  hero_asset_id?: string | null;
}): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    const space = await updateTeacherSpaceSettings(supabase, user.id, {
      ...input,
      email: user.email,
    });
    revalidateSpacePaths(space.handle);
    return {
      ok: true,
      message: space.is_published
        ? "Classroom Wall saved and published."
        : "Classroom Wall saved (unpublished — link won’t work until you publish).",
      publicPath: space.publicPath,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save Classroom Wall.",
    };
  }
}

export async function ensureMyTeacherSpace(): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    const space = await ensureTeacherSpace(supabase, user.id, user.email);
    revalidatePath("/teacher/classes");
    return { ok: true, publicPath: space.publicPath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create Classroom Wall.",
    };
  }
}

export async function publishBankActivityToSpace(
  activityId: string,
): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    const { itemId, space } = await publishActivityToTeacherSpace(
      supabase,
      user.id,
      activityId,
      user.email,
    );
    revalidateSpacePaths(space.handle);
    return {
      ok: true,
      message: space.is_published
        ? "Published to Classroom Wall."
        : "Added to Classroom Wall (turn on Publish so students can open the link).",
      publicPath: space.publicPath,
      itemId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not publish.",
    };
  }
}

export async function removeBankActivityFromSpace(
  activityId: string,
): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    await unpublishActivityFromSpace(supabase, user.id, activityId);
    revalidatePath("/teacher/classes");
    return { ok: true, message: "Removed from Classroom Wall." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not remove.",
    };
  }
}

export async function removeSpaceItem(
  itemId: string,
): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    await unpublishSpaceItem(supabase, user.id, itemId);
    revalidatePath("/teacher/classes");
    return { ok: true, message: "Removed from Classroom Wall." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not remove.",
    };
  }
}

export async function reorderMySpaceItems(
  orderedItemIds: string[],
): Promise<TeacherSpaceActionResult> {
  try {
    const { supabase, user } = await requireTeacher();
    await reorderTeacherSpaceItems(supabase, user.id, orderedItemIds);
    revalidatePath("/teacher/classes");
    return { ok: true, message: "Order saved." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reorder.",
    };
  }
}

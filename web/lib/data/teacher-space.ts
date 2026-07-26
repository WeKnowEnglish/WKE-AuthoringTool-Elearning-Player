import { unstable_noStore as noStore } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  getPublishedSpaceItem,
  getPublishedTeacherSpaceByHandle,
  getTeacherSpaceForOwner,
  listTeacherSpaceItemsForOwner,
  mapSpaceItemIdsByActivity,
} from "@/lib/teacher-space/load";
import type {
  PublicTeacherSpacePage,
  TeacherSpaceItemDetail,
  TeacherSpaceItemSummary,
  TeacherSpaceSummary,
} from "@/lib/teacher-space/types";
import { createClient } from "@/lib/supabase/server";

async function requireTeacherContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return { supabase, userId: user.id, email: user.email };
}

export async function getMyTeacherSpace(): Promise<TeacherSpaceSummary | null> {
  noStore();
  try {
    const { supabase, userId } = await requireTeacherContext();
    return await getTeacherSpaceForOwner(supabase, userId);
  } catch {
    return null;
  }
}

export async function listMyTeacherSpaceItems(): Promise<TeacherSpaceItemSummary[]> {
  noStore();
  try {
    const { supabase, userId } = await requireTeacherContext();
    return await listTeacherSpaceItemsForOwner(supabase, userId);
  } catch {
    return [];
  }
}

export async function getMySpaceItemIdsByActivity(): Promise<Record<string, string>> {
  noStore();
  try {
    const { supabase, userId } = await requireTeacherContext();
    return await mapSpaceItemIdsByActivity(supabase, userId);
  } catch {
    return {};
  }
}

export async function loadPublicTeacherSpace(
  handle: string,
): Promise<PublicTeacherSpacePage | null> {
  noStore();
  const supabase = await createClient();
  try {
    return await getPublishedTeacherSpaceByHandle(supabase, handle.toLowerCase());
  } catch {
    return null;
  }
}

export async function loadPublicTeacherSpaceItem(
  handle: string,
  itemId: string,
): Promise<
  | (TeacherSpaceItemDetail & { theme_id: string; spaceTitle: string })
  | null
> {
  noStore();
  const supabase = await createClient();
  try {
    return await getPublishedSpaceItem(supabase, handle.toLowerCase(), itemId);
  } catch {
    return null;
  }
}

export type {
  PublicTeacherSpacePage,
  TeacherSpaceItemDetail,
  TeacherSpaceItemSummary,
  TeacherSpaceSummary,
};

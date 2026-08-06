"use server";

import { revalidatePath } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import {
  deleteActivityTrackDraftForTeacher,
  getActivityTrackDraftForTeacher,
  listActivityTrackDraftsForTeacher,
  upsertActivityTrackDraft,
} from "@/lib/activity-tracks/draft-server";
import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user;
}

function revalidateTrackPaths(trackId?: string) {
  revalidatePath("/teacher/activity-builder/tracks");
  if (trackId) {
    revalidatePath(`/teacher/activity-builder/tracks/${trackId}`);
  }
}

export async function listActivityTrackDraftsAction(): Promise<
  Result<ActivityTrackDocument[]>
> {
  try {
    const user = await requireTeacher();
    const drafts = await listActivityTrackDraftsForTeacher(user.id);
    return { ok: true, data: drafts };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load track drafts.",
    };
  }
}

export async function getActivityTrackDraftAction(
  id: string,
): Promise<Result<ActivityTrackDocument>> {
  try {
    const user = await requireTeacher();
    const draft = await getActivityTrackDraftForTeacher(user.id, id);
    if (!draft) {
      return { ok: false, error: "Track draft not found." };
    }
    return { ok: true, data: draft };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load track draft.",
    };
  }
}

export async function saveActivityTrackDraftAction(
  doc: ActivityTrackDocument,
): Promise<Result<ActivityTrackDocument>> {
  try {
    const user = await requireTeacher();
    const saved = await upsertActivityTrackDraft(user.id, doc);
    revalidateTrackPaths(doc.id);
    return { ok: true, data: saved };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save track draft.",
    };
  }
}

export async function deleteActivityTrackDraftAction(id: string): Promise<Result> {
  try {
    const user = await requireTeacher();
    await deleteActivityTrackDraftForTeacher(user.id, id);
    revalidateTrackPaths(id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not delete track draft.",
    };
  }
}

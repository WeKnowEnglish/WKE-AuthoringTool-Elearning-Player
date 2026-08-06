"use client";

import {
  deleteActivityTrackDraftAction,
  getActivityTrackDraftAction,
  listActivityTrackDraftsAction,
  saveActivityTrackDraftAction,
} from "@/lib/actions/activity-track-drafts";
import {
  deleteActivityTrackDraft as deleteLocalDraft,
  getActivityTrackDraft as getLocalDraft,
  listActivityTrackDrafts as listLocalDrafts,
  saveActivityTrackDraft as saveLocalDraft,
} from "@/lib/activity-tracks/draft-storage";
import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";

export type ActivityTrackDraftSaveResult = {
  doc: ActivityTrackDocument;
  cloudSaved: boolean;
};

/** Write to local cache immediately, then persist to the teacher account. */
export async function persistActivityTrackDraft(
  doc: ActivityTrackDocument,
): Promise<ActivityTrackDraftSaveResult> {
  const saved = saveLocalDraft(doc);
  const result = await saveActivityTrackDraftAction(saved);
  return { doc: saved, cloudSaved: result.ok };
}

/** Load from account first; fall back to this browser's local cache. */
export async function loadActivityTrackDraft(
  id: string,
): Promise<ActivityTrackDocument | null> {
  const remote = await getActivityTrackDraftAction(id);
  if (remote.ok && remote.data) {
    saveLocalDraft(remote.data);
    return remote.data;
  }
  return getLocalDraft(id);
}

/** List account drafts, migrate any local-only drafts, and refresh the local cache. */
export async function listActivityTrackDraftsWithSync(): Promise<ActivityTrackDocument[]> {
  const remote = await listActivityTrackDraftsAction();
  if (!remote.ok || !remote.data) {
    return listLocalDrafts();
  }

  for (const doc of remote.data) {
    saveLocalDraft(doc);
  }

  const remoteIds = new Set(remote.data.map((doc) => doc.id));
  const localOnly = listLocalDrafts().filter((doc) => !remoteIds.has(doc.id));
  for (const doc of localOnly) {
    void saveActivityTrackDraftAction(doc);
  }

  const merged = [...remote.data];
  for (const doc of localOnly) {
    if (!merged.some((row) => row.id === doc.id)) {
      merged.push(doc);
    }
  }
  merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return merged;
}

/** Remove from local cache and the teacher account. */
export async function removeActivityTrackDraft(id: string): Promise<boolean> {
  deleteLocalDraft(id);
  const result = await deleteActivityTrackDraftAction(id);
  return result.ok;
}

import { parseActivityTrackDocument } from "@/lib/activity-tracks/parse-document";
import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";

const STORAGE_KEY = "wke-activity-track-drafts:v1";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): ActivityTrackDocument[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseActivityTrackDocument)
      .filter((doc): doc is ActivityTrackDocument => Boolean(doc))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeAll(docs: ActivityTrackDocument[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function listActivityTrackDrafts(): ActivityTrackDocument[] {
  return readAll();
}

export function getActivityTrackDraft(id: string): ActivityTrackDocument | null {
  return readAll().find((doc) => doc.id === id) ?? null;
}

export function saveActivityTrackDraft(doc: ActivityTrackDocument): ActivityTrackDocument {
  const next: ActivityTrackDocument = {
    ...doc,
    updatedAt: new Date().toISOString(),
  };
  const all = readAll().filter((row) => row.id !== next.id);
  all.unshift(next);
  writeAll(all);
  return next;
}

export function deleteActivityTrackDraft(id: string): void {
  writeAll(readAll().filter((row) => row.id !== id));
}

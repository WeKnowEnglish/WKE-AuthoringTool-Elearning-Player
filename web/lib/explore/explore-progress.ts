"use client";

import type { ExploreAreaId } from "@/lib/explore/areas/types";

export const EXPLORE_PROGRESS_STORAGE_KEY = "wke-explore-progress-v1";

export type ExploreProgressSnapshotV1 = {
  schemaVersion: 1;
  lastPlayedAreaId?: ExploreAreaId | null;
  /** Explore runs finished (any area). */
  totalRunsCompleted?: number;
};

function emptySnapshot(): ExploreProgressSnapshotV1 {
  return { schemaVersion: 1, lastPlayedAreaId: null, totalRunsCompleted: 0 };
}

function normalize(raw: unknown): ExploreProgressSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as ExploreProgressSnapshotV1;
  if (r.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    lastPlayedAreaId:
      typeof r.lastPlayedAreaId === "string" ? (r.lastPlayedAreaId as ExploreAreaId) : null,
    totalRunsCompleted:
      typeof r.totalRunsCompleted === "number" && Number.isFinite(r.totalRunsCompleted) ?
        Math.max(0, Math.floor(r.totalRunsCompleted))
      : 0,
  };
}

export function getExploreProgressSnapshot(): ExploreProgressSnapshotV1 {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(EXPLORE_PROGRESS_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    return normalize(JSON.parse(raw)) ?? emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: ExploreProgressSnapshotV1) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPLORE_PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function recordExploreRunPlayed(areaId: ExploreAreaId): ExploreProgressSnapshotV1 {
  const cur = getExploreProgressSnapshot();
  const next: ExploreProgressSnapshotV1 = {
    ...cur,
    lastPlayedAreaId: areaId,
    totalRunsCompleted: (cur.totalRunsCompleted ?? 0) + 1,
  };
  writeSnapshot(next);
  return next;
}

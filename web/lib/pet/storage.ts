"use client";

import {
  applyMeterDeltas,
  PET_CARE_METER_DELTAS,
  STUDY_COMPLETE_METER_DELTAS,
} from "@/lib/pet/care-actions";
import { applyDecay } from "@/lib/pet/decay";
import {
  DEFAULT_PET_METERS,
  emptyPetSnapshot,
  PET_STORAGE_KEY,
} from "@/lib/pet/defaults";
import type { PetCareActionId, PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";

function clampMeter(value: unknown): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(Number(value))));
}

function normalizeSnapshot(raw: unknown): PetSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as PetSnapshotV1;
  if (r.schemaVersion !== 1 || typeof r.lastUpdatedAt !== "number") return null;
  const meters = { ...DEFAULT_PET_METERS };
  for (const id of Object.keys(meters) as PetMeterId[]) {
    const v = r.meters?.[id];
    meters[id] = clampMeter(v);
  }
  return {
    schemaVersion: 1,
    meters,
    lastUpdatedAt: r.lastUpdatedAt,
    studyCarePending: r.studyCarePending === true,
    lastPetGoldClaimAt:
      typeof r.lastPetGoldClaimAt === "number" && Number.isFinite(r.lastPetGoldClaimAt) ?
        r.lastPetGoldClaimAt
      : undefined,
  };
}

function readRaw(): PetSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeRaw(snapshot: PetSnapshotV1) {
  localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(snapshot));
}

export function getPetSnapshot(): PetSnapshotV1 {
  if (typeof window === "undefined") {
    return emptyPetSnapshot(0);
  }
  const existing = readRaw();
  const base = existing ?? emptyPetSnapshot();
  const decayed = applyDecay(base, Date.now());
  if (!existing) writeRaw(decayed);
  else if (decayed.lastUpdatedAt !== base.lastUpdatedAt) writeRaw(decayed);
  return decayed;
}

export function setPetSnapshot(snapshot: PetSnapshotV1) {
  writeRaw(snapshot);
}

export function isStudyCarePending(): boolean {
  return getPetSnapshot().studyCarePending;
}

export function setStudyCarePending() {
  const s = getPetSnapshot();
  writeRaw({ ...s, studyCarePending: true, lastUpdatedAt: Date.now() });
}

export function applyPetCare(actionId: Exclude<PetCareActionId, "study">): PetSnapshotV1 {
  const now = Date.now();
  const base = getPetSnapshot();
  const deltas = PET_CARE_METER_DELTAS[actionId];
  const next = applyMeterDeltas(base, deltas, now);
  writeRaw(next);
  return next;
}

/** Grants study bonuses if pending; returns whether a reward was applied. */
export function completeStudyCareIfPending(): boolean {
  const base = getPetSnapshot();
  if (!base.studyCarePending) return false;
  const now = Date.now();
  const next = applyMeterDeltas(
    { ...base, studyCarePending: false },
    STUDY_COMPLETE_METER_DELTAS,
    now,
  );
  writeRaw(next);
  return true;
}

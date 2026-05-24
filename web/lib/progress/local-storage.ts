"use client";

import { normalizeLoadout } from "@/lib/avatar/apply-loadout";
import { loadoutForPreset, resolvePresetId } from "@/lib/avatar/defaults";
import { resolveAvatarLoadout } from "@/lib/avatar/progress";
import type { AvatarLoadout, AvatarPresetId } from "@/lib/avatar/types";
import { writeLearningBandCookie } from "@/lib/learning-band-cookie";
import { isLearningBand, type LearningBand } from "@/lib/learning-band";
import {
  isPlayerAppearanceId,
  migrateProgressSnapshotFields,
} from "@/lib/progress/migrate-pet-player";
import { resolvePetLoadoutFromSnapshot } from "@/lib/progress/resolve-pet-loadout";
import {
  emptySnapshot,
  PROGRESS_STORAGE_KEY,
  type PlayerAppearanceId,
  type PetKind,
  type ProgressSnapshotV1,
} from "@/lib/progress/types";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSnapshot(raw: unknown): ProgressSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as ProgressSnapshotV1;
  if (r.schemaVersion !== 1 || !r.anonymousDeviceId) return null;
  if (!Array.isArray(r.completedLessonIds)) return null;

  const base: ProgressSnapshotV1 = {
    ...r,
    completedLessonIds: r.completedLessonIds,
    enrolledCourseIds: Array.isArray(r.enrolledCourseIds) ? r.enrolledCourseIds : [],
    learningBand: isLearningBand(r.learningBand) ? r.learningBand : null,
    petKind: r.petKind === "dog" ? "dog" : null,
    petLoadout:
      r.petLoadout === undefined || r.petLoadout === null ?
        null
      : normalizeLoadout(r.petLoadout),
    playerAppearanceId:
      isPlayerAppearanceId(r.playerAppearanceId) ? r.playerAppearanceId : null,
    avatarLoadout:
      r.avatarLoadout === undefined || r.avatarLoadout === null ?
        null
      : normalizeLoadout(r.avatarLoadout),
    avatarId: r.avatarId === undefined ? null : r.avatarId,
  };

  return base;
}

function readRaw(): ProgressSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    const normalized = normalizeSnapshot(data);
    if (!normalized) return null;
    const { snapshot, changed } = migrateProgressSnapshotFields(normalized);
    if (changed) writeRaw(snapshot);
    return snapshot;
  } catch {
    return null;
  }
}

function writeRaw(s: ProgressSnapshotV1) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(s));
}

export function getProgressSnapshot(): ProgressSnapshotV1 {
  if (typeof window === "undefined") {
    return emptySnapshot("ssr");
  }
  const existing = readRaw();
  if (existing) return existing;
  const fresh = emptySnapshot(randomId());
  writeRaw(fresh);
  return fresh;
}

export function setProgressSnapshot(s: ProgressSnapshotV1) {
  writeRaw(migrateProgressSnapshotFields(s).snapshot);
}

export function markLessonComplete(lessonId: string) {
  const s = getProgressSnapshot();
  if (s.completedLessonIds.includes(lessonId)) return;
  s.completedLessonIds = [...s.completedLessonIds, lessonId];
  writeRaw(s);
}

export function setResumeScreen(lessonId: string, screenIndex: number) {
  const s = getProgressSnapshot();
  s.lessonResume = { ...s.lessonResume, [lessonId]: screenIndex };
  writeRaw(s);
}

export const AUDIO_MUTED_CHANGED_EVENT = "wke:audio-muted-changed";

export function setAudioMuted(muted: boolean) {
  const s = getProgressSnapshot();
  s.audioMuted = muted;
  writeRaw(s);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AUDIO_MUTED_CHANGED_EVENT, { detail: { muted } }),
    );
  }
}

export function isAudioMuted(): boolean {
  return getProgressSnapshot().audioMuted === true;
}

/** Whether the student has an active pet companion. */
export function hasChosenPet(): boolean {
  const s = getProgressSnapshot();
  return s.petKind === "dog" || resolvePetLoadoutFromSnapshot(s) !== null;
}

export function getPetKind(): PetKind | null {
  const kind = getProgressSnapshot().petKind;
  return kind === "dog" ? "dog" : null;
}

export function ensurePetDog(): void {
  const s = getProgressSnapshot();
  if (s.petKind === "dog") return;
  s.petKind = "dog";
  writeRaw(s);
}

/** @deprecated Use {@link hasChosenPet}. */
export function hasChosenAvatar(): boolean {
  return hasChosenPet();
}

/** Resolved pet loadout when chosen; otherwise `null`. */
export function getPetLoadout(): AvatarLoadout | null {
  return resolvePetLoadoutFromSnapshot(getProgressSnapshot());
}

/** @deprecated Use {@link getPetLoadout}. */
export function getChosenAvatarLoadout(): AvatarLoadout | null {
  return getPetLoadout();
}

export function getPlayerAppearanceId(): PlayerAppearanceId {
  const id = getProgressSnapshot().playerAppearanceId;
  return isPlayerAppearanceId(id) ? id : "default";
}

export function setPlayerAppearanceId(appearanceId: PlayerAppearanceId) {
  const s = getProgressSnapshot();
  s.playerAppearanceId = appearanceId;
  writeRaw(s);
}

export function setPetLoadout(loadout: AvatarLoadout) {
  const s = getProgressSnapshot();
  s.petLoadout = normalizeLoadout(loadout);
  s.avatarLoadout = null;
  s.avatarId = null;
  writeRaw(s);
}

export function setPetPreset(presetId: AvatarPresetId) {
  setPetLoadout(loadoutForPreset(presetId));
}

/** @deprecated Use {@link setPetLoadout}. */
export function setAvatarLoadout(loadout: AvatarLoadout) {
  setPetLoadout(loadout);
}

/** @deprecated Prefer {@link setPetPreset}. */
export function setAvatarId(id: string | null) {
  const s = getProgressSnapshot();
  const preset = id ? resolvePresetId(id) : null;
  if (preset) {
    s.petLoadout = loadoutForPreset(preset);
    s.avatarId = null;
    s.avatarLoadout = null;
  } else {
    s.avatarId = id;
    if (id === null) {
      s.petLoadout = null;
      s.avatarLoadout = null;
    }
  }
  writeRaw(s);
}

/** @deprecated Use {@link setPetPreset}. */
export function setAvatarPreset(presetId: AvatarPresetId) {
  setPetPreset(presetId);
}

export function getEnrolledCourseIds(): string[] {
  return getProgressSnapshot().enrolledCourseIds ?? [];
}

export function isEnrolledInCourse(courseId: string): boolean {
  return getEnrolledCourseIds().includes(courseId);
}

export function enrollInCourse(courseId: string) {
  const s = getProgressSnapshot();
  const ids = new Set(s.enrolledCourseIds ?? []);
  ids.add(courseId);
  s.enrolledCourseIds = [...ids];
  writeRaw(s);
}

export function getLearningBand(): LearningBand | null {
  const band = getProgressSnapshot().learningBand;
  return isLearningBand(band) ? band : null;
}

export function setLearningBand(band: LearningBand) {
  const s = getProgressSnapshot();
  s.learningBand = band;
  writeRaw(s);
  writeLearningBandCookie(band);
}

export function clearLearningBand() {
  const s = getProgressSnapshot();
  s.learningBand = null;
  writeRaw(s);
}

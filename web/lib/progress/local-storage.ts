"use client";

import { normalizeLoadout } from "@/lib/avatar/apply-loadout";
import { loadoutForPreset, resolvePresetId } from "@/lib/avatar/defaults";
import { resolveAvatarLoadout } from "@/lib/avatar/progress";
import type { AvatarLoadout, AvatarPresetId } from "@/lib/avatar/types";
import { writeLearningBandCookie } from "@/lib/learning-band-cookie";
import { isLearningBand, type LearningBand } from "@/lib/learning-band";
import {
  emptySnapshot,
  PROGRESS_STORAGE_KEY,
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
  return {
    ...r,
    completedLessonIds: r.completedLessonIds,
    enrolledCourseIds: Array.isArray(r.enrolledCourseIds) ? r.enrolledCourseIds : [],
    learningBand: isLearningBand(r.learningBand) ? r.learningBand : null,
    avatarLoadout:
      r.avatarLoadout === undefined || r.avatarLoadout === null ?
        null
      : normalizeLoadout(r.avatarLoadout),
    avatarId: r.avatarId === undefined ? null : r.avatarId,
  };
}

function readRaw(): ProgressSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    return normalizeSnapshot(data);
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
  writeRaw(s);
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

export function setAudioMuted(muted: boolean) {
  const s = getProgressSnapshot();
  s.audioMuted = muted;
  writeRaw(s);
}

export function isAudioMuted(): boolean {
  return getProgressSnapshot().audioMuted === true;
}

/** Whether the student has chosen an avatar (loadout or legacy buddy id). */
export function hasChosenAvatar(): boolean {
  const s = getProgressSnapshot();
  return Boolean(s.avatarLoadout) || Boolean(s.avatarId);
}

/** Resolved loadout when chosen; otherwise `null`. */
export function getChosenAvatarLoadout(): AvatarLoadout | null {
  const s = getProgressSnapshot();
  if (!s.avatarLoadout && !s.avatarId) return null;
  return resolveAvatarLoadout(s.avatarLoadout, s.avatarId);
}

export function setAvatarLoadout(loadout: AvatarLoadout) {
  const s = getProgressSnapshot();
  s.avatarLoadout = normalizeLoadout(loadout);
  s.avatarId = null;
  writeRaw(s);
}

/** @deprecated Prefer {@link setAvatarLoadout} with a preset loadout. */
export function setAvatarId(id: string | null) {
  const s = getProgressSnapshot();
  const preset = id ? resolvePresetId(id) : null;
  if (preset) {
    s.avatarLoadout = loadoutForPreset(preset);
    s.avatarId = null;
  } else {
    s.avatarId = id;
    s.avatarLoadout = id === null ? null : s.avatarLoadout;
  }
  writeRaw(s);
}

export function setAvatarPreset(presetId: AvatarPresetId) {
  setAvatarLoadout(loadoutForPreset(presetId));
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

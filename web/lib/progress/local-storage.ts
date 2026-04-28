"use client";

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
    correctAnswersTotal: r.correctAnswersTotal ?? 0,
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

const STICKER_EVERY = 3;

/** Call when the learner answers an interaction correctly. Returns sticker count and whether a new sticker was earned. */
export function recordCorrectAnswer(): { stickers: number; newSticker: boolean } {
  const s = getProgressSnapshot();
  const prev = s.correctAnswersTotal ?? 0;
  const next = prev + 1;
  s.correctAnswersTotal = next;
  writeRaw(s);
  const prevStickers = Math.floor(prev / STICKER_EVERY);
  const nextStickers = Math.floor(next / STICKER_EVERY);
  return { stickers: nextStickers, newSticker: nextStickers > prevStickers };
}

export function setAvatarId(id: string | null) {
  const s = getProgressSnapshot();
  s.avatarId = id;
  writeRaw(s);
}

export function getStickerCount(snapshot?: ProgressSnapshotV1): number {
  const s = snapshot ?? getProgressSnapshot();
  const t = s.correctAnswersTotal ?? 0;
  return Math.floor(t / STICKER_EVERY);
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

"use client";

import {
  getAllSecondaryWordItemIds,
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import {
  getSecondaryWordProgressRecord,
  resolveSecondaryStudentId,
} from "@/lib/secondary/secondary-word-progress";
import type {
  SecondaryTodayActivityCompletion,
  SecondaryTodayActivityKey,
  SecondaryTodayCompletion,
  SecondaryTodaySession,
  SecondaryWordProgressRecord,
} from "@/lib/secondary/types";

export const TARGET_WORDS = 10;
export const WARMUP_WORDS = 3;
export const MASTERED_LEVEL_THRESHOLD = 4;

const SESSION_STORAGE_KEY_PREFIX = "secondary-vocab-today-session-v2:";
const COMPLETION_STORAGE_KEY_PREFIX = "secondary-vocab-today-completion-v1:";

export function getSecondaryTodayDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSessionStorageKey(studentId: string, dateKey: string): string {
  return `${SESSION_STORAGE_KEY_PREFIX}${studentId}:${dateKey}`;
}

function getCompletionStorageKey(studentId: string, dateKey: string): string {
  return `${COMPLETION_STORAGE_KEY_PREFIX}${studentId}:${dateKey}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

type WordSignals = {
  wordItemId: string;
  masteryLevel: number;
  recentAccuracy: number;
  timesSeen: number;
  nextReviewAtMs: number;
};

function getWordSignals(wordItemId: string): WordSignals {
  const record: SecondaryWordProgressRecord | null =
    getSecondaryWordProgressRecord(wordItemId);
  const now = Date.now();

  if (!record) {
    return {
      wordItemId,
      masteryLevel: 0,
      recentAccuracy: 0,
      timesSeen: 0,
      nextReviewAtMs: now - 1,
    };
  }

  return {
    wordItemId,
    masteryLevel: record.masteryLevel,
    recentAccuracy: record.recentAccuracy,
    timesSeen: record.timesSeen,
    nextReviewAtMs: record.nextReviewAt
      ? new Date(record.nextReviewAt).getTime()
      : now - 1,
  };
}

function sortWeakestFirst(signals: WordSignals[]): WordSignals[] {
  return [...signals].sort((a, b) => {
    if (a.masteryLevel !== b.masteryLevel) return a.masteryLevel - b.masteryLevel;
    if (a.recentAccuracy !== b.recentAccuracy) return a.recentAccuracy - b.recentAccuracy;
    if (a.timesSeen !== b.timesSeen) return a.timesSeen - b.timesSeen;
    return a.wordItemId.localeCompare(b.wordItemId);
  });
}

function normalizeSession(raw: SecondaryTodaySession): SecondaryTodaySession | null {
  if (!raw.allWordItemIds?.length) return null;
  return raw;
}

export function getOrCreateSecondaryTodaySession(now: Date): SecondaryTodaySession {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  const storageKey = getSessionStorageKey(studentId, dateKey);

  const existingRaw = readJson<SecondaryTodaySession>(storageKey);
  if (existingRaw) {
    const existing = normalizeSession(existingRaw);
    if (existing) return existing;
  }

  const candidateWordItemIds = getAllSecondaryWordItemIds();
  const candidateSignals = candidateWordItemIds.map((wordItemId) =>
    getWordSignals(wordItemId),
  );
  const dueSignals = candidateSignals.filter((s) => s.nextReviewAtMs <= now.getTime());

  const warmupSignals = sortWeakestFirst(
    dueSignals.filter((s) => s.timesSeen > 0),
  ).slice(0, WARMUP_WORDS);
  const warmUpWordItemIds = warmupSignals.map((s) => s.wordItemId);
  const warmUpSet = new Set(warmUpWordItemIds);

  const remainingDue = sortWeakestFirst(
    dueSignals.filter((s) => !warmUpSet.has(s.wordItemId)),
  );
  const targetTodayCount = Math.max(0, TARGET_WORDS - warmUpWordItemIds.length);

  const todaySignals: WordSignals[] = remainingDue.slice(0, targetTodayCount);
  const todaySet = new Set(todaySignals.map((s) => s.wordItemId));

  if (todaySignals.length < targetTodayCount) {
    const additionalNew = sortWeakestFirst(
      candidateSignals.filter((s) => s.timesSeen === 0 && !todaySet.has(s.wordItemId)),
    );
    const needed = targetTodayCount - todaySignals.length;
    todaySignals.push(...additionalNew.slice(0, needed));
  }

  // Keep cloze usable by ensuring required blank words are included.
  for (const template of getSecondaryClozeTemplates()) {
    for (const blankId of template.blankWordItemIds) {
      if (!getSecondaryVocabItemById(blankId)) continue;
      if (
        !todaySignals.some((s) => s.wordItemId === blankId) &&
        !warmUpSet.has(blankId)
      ) {
        todaySignals.push(getWordSignals(blankId));
      }
    }
  }

  const todayWordItemIds = Array.from(
    new Set(todaySignals.map((s) => s.wordItemId)),
  );
  const allWordItemIds = Array.from(
    new Set([...warmUpWordItemIds, ...todayWordItemIds]),
  );

  const next: SecondaryTodaySession = {
    dateKey,
    warmUpWordItemIds,
    todayWordItemIds,
    allWordItemIds,
  };

  writeJson(storageKey, next);
  return next;
}

export function getSecondaryTodayCompletion(now: Date): SecondaryTodayCompletion {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  return readJson<SecondaryTodayCompletion>(getCompletionStorageKey(studentId, dateKey)) ?? {};
}

export function setSecondaryTodayActivityCompletion(
  activityKey: SecondaryTodayActivityKey,
  completion: SecondaryTodayActivityCompletion,
  now: Date,
): void {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  const storageKey = getCompletionStorageKey(studentId, dateKey);
  const existing = readJson<SecondaryTodayCompletion>(storageKey) ?? {};
  existing[activityKey] = completion;
  writeJson(storageKey, existing);
}

export function clearSecondaryTodayActivityCompletion(
  activityKey: SecondaryTodayActivityKey,
  now: Date,
): void {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  const storageKey = getCompletionStorageKey(studentId, dateKey);
  const existing = readJson<SecondaryTodayCompletion>(storageKey) ?? {};
  delete existing[activityKey];
  writeJson(storageKey, existing);
}

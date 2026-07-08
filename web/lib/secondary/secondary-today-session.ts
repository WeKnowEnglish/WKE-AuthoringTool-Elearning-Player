"use client";

import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import { isSecondaryWordMastered } from "@/lib/secondary/secondary-mastery-display";
import {
  selectSecondaryTodayWords,
  TARGET_TODAY_WORDS,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-session-selection";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  getAllSecondaryWordItemIds,
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import {
  COMPLETION_STORAGE_KEY_PREFIX,
  resolveSecondaryStudentId,
  SESSION_STORAGE_KEY_PREFIX,
} from "@/lib/secondary/secondary-student-id";
import type {
  SecondaryTodayActivityCompletion,
  SecondaryTodayActivityKey,
  SecondaryTodayCompletion,
  SecondaryTodaySession,
} from "@/lib/secondary/types";

export { WARMUP_WORDS, TARGET_TODAY_WORDS };

/** @deprecated Use TARGET_TODAY_WORDS — v1 counted warmup inside TARGET_WORDS. */
export const TARGET_WORDS = TARGET_TODAY_WORDS;

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

function normalizeSession(raw: SecondaryTodaySession | null | undefined): SecondaryTodaySession | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.dateKey !== "string" || !raw.dateKey) return null;
  if (!Array.isArray(raw.allWordItemIds)) return null;
  if (!Array.isArray(raw.warmUpWordItemIds) || !Array.isArray(raw.todayWordItemIds)) return null;

  const allWordItemIds = raw.allWordItemIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  const warmUpWordItemIds = raw.warmUpWordItemIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  const todayWordItemIds = raw.todayWordItemIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  const session: SecondaryTodaySession = {
    dateKey: raw.dateKey,
    warmUpWordItemIds,
    todayWordItemIds,
    allWordItemIds,
  };
  if (raw.selectionVersion === 2) {
    session.selectionVersion = 2;
  }
  return session;
}

function emptySession(dateKey: string): SecondaryTodaySession {
  return {
    dateKey,
    warmUpWordItemIds: [],
    todayWordItemIds: [],
    allWordItemIds: [],
  };
}

function isStaleEmptySession(session: SecondaryTodaySession): boolean {
  return session.allWordItemIds.length === 0 && getAllSecondaryWordItemIds().length > 0;
}

function collectClozeBlankIds(candidateWordItemIds: string[]): string[] {
  const clozeEligible = new Set(
    filterWordItemIdsForSecondaryActivity(candidateWordItemIds, "cloze"),
  );
  const blankIds: string[] = [];

  for (const template of getSecondaryClozeTemplates()) {
    for (const blankId of template.blankWordItemIds) {
      if (!getSecondaryVocabItemById(blankId)) continue;
      if (!clozeEligible.has(blankId)) continue;
      blankIds.push(blankId);
    }
  }

  return blankIds;
}

function buildSecondaryTodaySession(
  now: Date,
  dateKey: string,
  studentId: string,
): SecondaryTodaySession {
  const candidateWordItemIds = getAllSecondaryWordItemIds();
  if (candidateWordItemIds.length === 0) {
    return emptySession(dateKey);
  }

  const selection = selectSecondaryTodayWords({
    candidateWordItemIds,
    studentId,
    dateKey,
    now,
    clozeBlankIds: collectClozeBlankIds(candidateWordItemIds),
    masteryRecords: readMasterySnapshot().records,
  });

  return {
    dateKey,
    warmUpWordItemIds: selection.warmUpWordItemIds,
    todayWordItemIds: selection.todayWordItemIds,
    allWordItemIds: selection.allWordItemIds,
    selectionVersion: 2,
  };
}

export function getOrCreateSecondaryTodaySession(now: Date): SecondaryTodaySession {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  const storageKey = getSessionStorageKey(studentId, dateKey);

  const existingRaw = readJson<SecondaryTodaySession>(storageKey);
  if (existingRaw) {
    const existing = normalizeSession(existingRaw);
    if (existing && !isStaleEmptySession(existing)) return existing;
  }

  const next = buildSecondaryTodaySession(now, dateKey, studentId);
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

export { isSecondaryWordMastered };

"use client";

import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import { isSecondaryWordMastered } from "@/lib/secondary/secondary-mastery-display";
import {
  selectSecondaryTodayWords,
  SECONDARY_SELECTION_VERSION,
  TARGET_TODAY_WORDS,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-session-selection";
import {
  isStaleUnknownWordSession,
  pruneLocalActivityStoresForSession,
} from "@/lib/secondary/secondary-session-lifecycle";
import { afterSecondaryActivityCompletion } from "@/lib/secondary/secondary-activity-completion";
import {
  reconcileSecondarySessionSlowReplace,
} from "@/lib/secondary/secondary-session-slow-replace";
import {
  reconcileSecondarySessionWarmupPrune,
} from "@/lib/secondary/secondary-session-warmup-prune";
import {
  getAllSecondaryWordItemIds,
  SECONDARY_VOCAB_PACK_ID,
  SECONDARY_VOCAB_PACK_VERSION,
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

/** @deprecated Use SECONDARY_SELECTION_VERSION from secondary-session-selection.ts */
export { SECONDARY_SELECTION_VERSION } from "@/lib/secondary/secondary-session-selection";

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
  if (raw.selectionVersion === 2 || raw.selectionVersion === 3 || raw.selectionVersion === 4) {
    session.selectionVersion = raw.selectionVersion;
  }
  if (Array.isArray(raw.masteredOnListOrder)) {
    session.masteredOnListOrder = raw.masteredOnListOrder.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (Array.isArray(raw.replacedOutWordItemIds)) {
    session.replacedOutWordItemIds = raw.replacedOutWordItemIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (typeof raw.packId === "string" && raw.packId) {
    session.packId = raw.packId;
  }
  if (typeof raw.packVersion === "string" && raw.packVersion) {
    session.packVersion = raw.packVersion;
  }
  if (Array.isArray(raw.initialTodayWordItemIds)) {
    session.initialTodayWordItemIds = raw.initialTodayWordItemIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (Array.isArray(raw.introducedWordItemIds)) {
    session.introducedWordItemIds = raw.introducedWordItemIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }
  if (raw.selectionReasons && typeof raw.selectionReasons === "object") {
    session.selectionReasons = Object.fromEntries(
      Object.entries(raw.selectionReasons).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          entry[0].length > 0 &&
          typeof entry[1] === "string" &&
          entry[1].length > 0,
      ),
    );
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

function isStalePackSession(session: SecondaryTodaySession): boolean {
  return (
    session.packId !== SECONDARY_VOCAB_PACK_ID ||
    session.packVersion !== SECONDARY_VOCAB_PACK_VERSION
  );
}

function isStaleSelectionVersion(session: SecondaryTodaySession): boolean {
  return session.selectionVersion !== SECONDARY_SELECTION_VERSION;
}

function isStaleCachedSession(session: SecondaryTodaySession): boolean {
  return (
    isStaleEmptySession(session) ||
    isStalePackSession(session) ||
    isStaleUnknownWordSession(session) ||
    isStaleSelectionVersion(session)
  );
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
    clozeBlankIds: [],
    masteryRecords: readMasterySnapshot().records,
  });

  return {
    dateKey,
    warmUpWordItemIds: selection.warmUpWordItemIds,
    todayWordItemIds: selection.todayWordItemIds,
    allWordItemIds: selection.allWordItemIds,
    selectionVersion: SECONDARY_SELECTION_VERSION,
    packId: SECONDARY_VOCAB_PACK_ID,
    packVersion: SECONDARY_VOCAB_PACK_VERSION,
    initialTodayWordItemIds: [...selection.todayWordItemIds],
    introducedWordItemIds: [],
    selectionReasons: selection.reasons ? { ...selection.reasons } : {},
  };
}

function finalizeSecondaryTodaySession(
  session: SecondaryTodaySession,
  studentId: string,
  now: Date,
): SecondaryTodaySession {
  const masteryRecords = readMasterySnapshot().records;
  const afterWarmup = reconcileSecondarySessionWarmupPrune({
    session,
    masteryRecords,
  }).session;
  const reconciled = applySlowReplaceToSession(afterWarmup, studentId, now);
  pruneLocalActivityStoresForSession(reconciled);
  return reconciled;
}

function applySlowReplaceToSession(
  session: SecondaryTodaySession,
  studentId: string,
  now: Date,
): SecondaryTodaySession {
  const candidateWordItemIds = getAllSecondaryWordItemIds();
  if (candidateWordItemIds.length === 0) return session;

  return reconcileSecondarySessionSlowReplace({
    session,
    candidateWordItemIds,
    masteryRecords: readMasterySnapshot().records,
    studentId,
    now,
  }).session;
}

export function getOrCreateSecondaryTodaySession(now: Date): SecondaryTodaySession {
  const studentId = resolveSecondaryStudentId();
  const dateKey = getSecondaryTodayDateKey(now);
  const storageKey = getSessionStorageKey(studentId, dateKey);

  const existingRaw = readJson<SecondaryTodaySession>(storageKey);
  let session: SecondaryTodaySession | null = null;
  let loadedFromCache = false;

  if (existingRaw) {
    const existing = normalizeSession(existingRaw);
    if (existing && !isStaleCachedSession(existing)) {
      session = existing;
      loadedFromCache = true;
    }
  }

  if (!session) {
    session = buildSecondaryTodaySession(now, dateKey, studentId);
  }

  const reconciled = finalizeSecondaryTodaySession(session, studentId, now);
  if (!loadedFromCache || JSON.stringify(session) !== JSON.stringify(reconciled)) {
    writeJson(storageKey, reconciled);
  }
  return reconciled;
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
  afterSecondaryActivityCompletion();
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

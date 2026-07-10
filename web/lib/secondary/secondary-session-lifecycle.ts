import {
  buildSecondaryActivitySessionId,
  readLocalActivityMap,
  writeLocalActivityMap,
} from "@/lib/secondary/local-activity-store";
import { getAllSecondaryWordItemIds } from "@/lib/secondary/secondary-vocab-bank";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import type { SecondaryTodayActivityKey, SecondaryTodaySession } from "@/lib/secondary/types";

const ACTIVITY_KEYS: SecondaryTodayActivityKey[] = ["match", "cloze", "spelling", "sentence"];

export function isStaleUnknownWordSession(session: SecondaryTodaySession): boolean {
  const bankIds = new Set(getAllSecondaryWordItemIds());
  if (bankIds.size === 0) return false;

  const idsToCheck = [
    ...session.allWordItemIds,
    ...session.todayWordItemIds,
    ...session.warmUpWordItemIds,
    ...(session.initialTodayWordItemIds ?? []),
    ...(session.introducedWordItemIds ?? []),
    ...(session.replacedOutWordItemIds ?? []),
    ...(session.masteredOnListOrder ?? []),
  ];

  for (const wordItemId of idsToCheck) {
    if (!bankIds.has(wordItemId)) return true;
  }
  return false;
}

export function pruneLocalActivityStoresForSession(session: SecondaryTodaySession): boolean {
  if (typeof window === "undefined") return false;

  const studentId = resolveSecondaryStudentId();
  const validWordItemIds = new Set(session.allWordItemIds);
  let changed = false;

  for (const activityKey of ACTIVITY_KEYS) {
    const activitySessionId = buildSecondaryActivitySessionId(session.dateKey, activityKey);
    const map = readLocalActivityMap(studentId, activitySessionId);
    const next: Record<string, (typeof map)[string]> = {};

    for (const [wordItemId, state] of Object.entries(map)) {
      if (validWordItemIds.has(wordItemId)) {
        next[wordItemId] = state;
      } else {
        changed = true;
      }
    }

    if (changed) {
      writeLocalActivityMap(studentId, activitySessionId, next);
    }
  }

  return changed;
}

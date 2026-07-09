/**
 * M1/M2 secondary → platform mastery bridge.
 */

import { getMasteryRecordForTarget } from "@/lib/mastery/local-storage";
import { recordVocabularyEvidence } from "@/lib/mastery/vocabulary";
import type {
  SecondaryWordAttempt,
  SecondaryWordProgressRecord,
  WordMasteryLevel,
} from "@/lib/secondary/types";

export type SecondaryEvidenceActivity = SecondaryWordAttempt["activityType"];

export type SecondaryAttemptEvidenceMeta = {
  firstTry: boolean;
  attempts: number;
};

function todayDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function secondaryActivityToEvidenceShape(activity: SecondaryEvidenceActivity): {
  activityId: string;
  responseKind: "match" | "type";
  evidenceMode: "recognition" | "recall";
} {
  if (activity === "match") {
    return {
      activityId: "secondary:match",
      responseKind: "match",
      evidenceMode: "recognition",
    };
  }
  if (activity === "learn") {
    return {
      activityId: "secondary:learn",
      responseKind: "match",
      evidenceMode: "recognition",
    };
  }
  return {
    activityId: activity === "cloze" ? "secondary:cloze" : "secondary:spelling",
    responseKind: "type",
    evidenceMode: "recall",
  };
}

export function projectMasteryScoreToLegacyLevel(masteryScore01: number): WordMasteryLevel {
  const score = Math.max(0, Math.min(1, masteryScore01)) * 100;
  if (score < 20) return 0;
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 75) return 3;
  if (score < 90) return 4;
  return 5;
}

export function projectPlatformMasteryToSecondaryRecord(input: {
  wordItemId: string;
  masteryScore01: number;
  timesSeen: number;
  timesCorrect: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
}): SecondaryWordProgressRecord {
  const masteryLevel = projectMasteryScoreToLegacyLevel(input.masteryScore01);
  const recentAccuracy =
    input.timesSeen > 0 ? input.timesCorrect / input.timesSeen : 0;

  return {
    wordItemId: input.wordItemId,
    masteryLevel,
    timesSeen: input.timesSeen,
    timesCorrect: input.timesCorrect,
    correctStreak: 0,
    recentAccuracy,
    lastPracticedAt: input.lastPracticedAt,
    nextReviewAt: input.nextReviewAt ?? input.lastPracticedAt,
  };
}

export function applySecondaryAttemptToPlatformMastery(input: {
  studentId: string;
  attempt: SecondaryWordAttempt;
  evidenceMeta?: SecondaryAttemptEvidenceMeta;
}): SecondaryWordProgressRecord {
  const { studentId, attempt, evidenceMeta } = input;
  const shape = secondaryActivityToEvidenceShape(attempt.activityType);
  const dateKey = todayDateKeyFromIso(attempt.attemptedAt);
  const occurredAt = new Date(attempt.attemptedAt);
  const occurredAtIso = Number.isNaN(occurredAt.getTime())
    ? new Date().toISOString()
    : occurredAt.toISOString();

  const attempts = Math.max(1, evidenceMeta?.attempts ?? 1);
  const firstTry = evidenceMeta?.firstTry ?? attempts === 1;

  recordVocabularyEvidence({
    studentId,
    wordId: attempt.wordItemId,
    itemId: attempt.wordItemId,
    activityId: shape.activityId,
    sessionId: `secondary:${dateKey}`,
    success: attempt.isCorrect,
    firstTry,
    attempts,
    responseKind: shape.responseKind,
    evidenceMode: shape.evidenceMode,
    occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
  });

  const mastery = getMasteryRecordForTarget({
    type: "word",
    key: attempt.wordItemId,
  });

  return projectPlatformMasteryToSecondaryRecord({
    wordItemId: attempt.wordItemId,
    masteryScore01: mastery?.masteryScore ?? 0,
    timesSeen: mastery?.exposureCount ?? 0,
    timesCorrect: mastery?.retrievalSuccessCount ?? 0,
    lastPracticedAt: occurredAtIso,
    nextReviewAt: mastery?.nextReviewAt ?? undefined,
  });
}
